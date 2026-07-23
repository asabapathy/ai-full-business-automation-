import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import slugify from 'slugify'
import type { LoginRequest, RegisterRequest, TokenPair, AuthUser, JwtPayload } from '@kanavu/types'
import { config } from '../config/index.js'
import { prisma } from './database.js'
import { redis } from './redis.js'
import { ConflictError, AuthenticationError, NotFoundError } from '../utils/errors.js'

const SALT_ROUNDS = 12
const REFRESH_TOKEN_BLACKLIST_PREFIX = 'rt:blacklist:'

export class AuthService {
  async register(data: RegisterRequest): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } })
    if (existingUser) {
      throw new ConflictError('An account with this email already exists')
    }

    const slug = await this.generateOrgSlug(data.organizationName)
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)

    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
      })

      const org = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug,
          industry: (data.industry as never) ?? 'OTHER',
          members: {
            create: {
              userId: user.id,
              role: 'ADMIN',
              joinedAt: new Date(),
            },
          },
        },
      })

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: 'FREE',
          status: 'TRIALING',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      })

      return { user, org }
    })

    const authUser: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      isSuperAdmin: result.user.isSuperAdmin,
      currentOrganizationId: result.org.id,
      role: 'ADMIN',
    }

    const tokens = this.generateTokens(result.user.id, result.user.email, result.org.id, 'ADMIN')
    await this.saveRefreshToken(result.user.id, tokens.refreshToken)

    return { user: authUser, tokens }
  }

  async login(data: LoginRequest): Promise<{ user: AuthUser; tokens: TokenPair; organization: { id: string; name: string; slug: string } }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase(), isActive: true },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: { select: { id: true, name: true, slug: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })

    if (!user || !user.passwordHash) {
      throw new AuthenticationError('Invalid email or password')
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash)
    if (!passwordValid) {
      throw new AuthenticationError('Invalid email or password')
    }

    let membership = user.memberships[0]
    if (data.organizationSlug) {
      membership = user.memberships.find(m => m.organization.slug === data.organizationSlug) ?? membership
    }

    if (!membership) {
      throw new NotFoundError('Organization membership')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? undefined,
      isSuperAdmin: user.isSuperAdmin,
      currentOrganizationId: membership.organizationId,
      role: membership.role,
    }

    const tokens = this.generateTokens(user.id, user.email, membership.organizationId, membership.role)
    await this.saveRefreshToken(user.id, tokens.refreshToken)

    return { user: authUser, tokens, organization: membership.organization }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const isBlacklisted = await redis.exists(`${REFRESH_TOKEN_BLACKLIST_PREFIX}${refreshToken}`)
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked')
    }

    let payload: JwtPayload
    try {
      payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as JwtPayload
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token')
    }

    if (payload.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type')
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken, revokedAt: null },
    })
    if (!storedToken) {
      throw new AuthenticationError('Refresh token not found')
    }

    await prisma.refreshToken.update({ where: { id: storedToken.id }, data: { revokedAt: new Date() } })
    await redis.setEx(`${REFRESH_TOKEN_BLACKLIST_PREFIX}${refreshToken}`, 7 * 24 * 60 * 60, '1')

    const tokens = this.generateTokens(payload.sub, payload.email, payload.organizationId, payload.role)
    await this.saveRefreshToken(payload.sub, tokens.refreshToken)

    return tokens
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken },
      data: { revokedAt: new Date() },
    })
    await redis.setEx(`${REFRESH_TOKEN_BLACKLIST_PREFIX}${refreshToken}`, 7 * 24 * 60 * 60, '1')
  }

  private generateTokens(userId: string, email: string, organizationId?: string, role?: string): TokenPair {
    const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      organizationId,
      role,
      type: 'access',
    }

    const refreshPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      organizationId,
      role,
      type: 'refresh',
    }

    const accessToken = jwt.sign(accessPayload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    } as jwt.SignOptions)

    const refreshToken = jwt.sign(refreshPayload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions)

    return { accessToken, refreshToken, expiresIn: 15 * 60 }
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
  }

  private async generateOrgSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true })
    let slug = base
    let attempt = 0

    while (attempt < 10) {
      const existing = await prisma.organization.findUnique({ where: { slug } })
      if (!existing) return slug
      slug = `${base}-${nanoid(4)}`
      attempt++
    }

    return `${base}-${nanoid(8)}`
  }
}

export const authService = new AuthService()
