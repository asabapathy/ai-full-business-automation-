export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  isSuperAdmin: boolean
  currentOrganizationId?: string
  role?: string
  permissions?: string[]
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginRequest {
  email: string
  password: string
  organizationSlug?: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
  industry?: string
  phone?: string
}

export interface JwtPayload {
  sub: string
  email: string
  organizationId?: string
  role?: string
  type: 'access' | 'refresh'
  iat: number
  exp: number
}

export interface InviteMemberRequest {
  email: string
  firstName: string
  lastName: string
  role: string
}
