import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin'

interface PostRequest {
  content: string
  mediaUrls?: string[]
  scheduledAt?: string
  aiGenerated?: boolean
}

interface MetaPostResult {
  id: string
  error?: { message: string; code: number }
}

export class SocialService {
  async getAccounts(organizationId: string) {
    return prisma.socialAccount.findMany({
      where: { organizationId },
      select: { id: true, platform: true, accountId: true, accountName: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async disconnectAccount(organizationId: string, accountId: string) {
    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, organizationId },
    })
    if (!account) throw new Error('Account not found')

    await prisma.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false, accessToken: null, refreshToken: null },
    })
  }

  async generateOAuthUrl(platform: Platform, organizationId: string): Promise<string> {
    const state = Buffer.from(JSON.stringify({ platform, organizationId })).toString('base64')
    const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000'
    const callbackUrl = `${appUrl}/api/v1/social/oauth/callback/${platform}`

    switch (platform) {
      case 'facebook':
      case 'instagram': {
        const appId = process.env['META_APP_ID']
        if (!appId) throw new Error('META_APP_ID not configured')
        const scope = platform === 'instagram'
          ? 'instagram_basic,instagram_content_publish,pages_show_list'
          : 'pages_show_list,pages_read_engagement,pages_manage_posts'
        return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}&state=${state}&response_type=code`
      }
      case 'linkedin': {
        const clientId = process.env['LINKEDIN_CLIENT_ID']
        if (!clientId) throw new Error('LINKEDIN_CLIENT_ID not configured')
        return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=w_member_social%20r_liteprofile&state=${state}`
      }
      case 'twitter': {
        const clientId = process.env['TWITTER_CLIENT_ID']
        if (!clientId) throw new Error('TWITTER_CLIENT_ID not configured')
        return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=tweet.read%20tweet.write%20users.read&state=${state}&code_challenge=challenge&code_challenge_method=plain`
      }
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  async handleOAuthCallback(platform: Platform, code: string, stateB64: string): Promise<{ organizationId: string }> {
    const state = JSON.parse(Buffer.from(stateB64, 'base64').toString()) as { platform: string; organizationId: string }
    const organizationId = state.organizationId
    const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000'
    const callbackUrl = `${appUrl}/api/v1/social/oauth/callback/${platform}`

    switch (platform) {
      case 'facebook':
      case 'instagram': {
        const appId = process.env['META_APP_ID']
        const appSecret = process.env['META_APP_SECRET']
        if (!appId || !appSecret) throw new Error('Meta credentials not configured')

        const tokenRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${appSecret}&code=${code}`,
        )
        const tokenData = await tokenRes.json() as { access_token: string; error?: { message: string } }
        if (tokenData.error) throw new Error(tokenData.error.message)

        // Get long-lived token
        const longLivedRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`,
        )
        const longLivedData = await longLivedRes.json() as { access_token: string }
        const accessToken = longLivedData.access_token

        // Get pages
        const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`)
        const pagesData = await pagesRes.json() as { data: Array<{ id: string; name: string; access_token: string }> }

        for (const page of pagesData.data ?? []) {
          await prisma.socialAccount.upsert({
            where: { organizationId_platform_accountId: { organizationId, platform: platform.toUpperCase(), accountId: page.id } } as never,
            update: { accountName: page.name, accessToken: page.access_token, isActive: true },
            create: {
              organizationId,
              platform: platform.toUpperCase(),
              accountId: page.id,
              accountName: page.name,
              accessToken: page.access_token,
            },
          }).catch(() => prisma.socialAccount.create({
            data: {
              organizationId,
              platform: platform.toUpperCase(),
              accountId: page.id,
              accountName: page.name,
              accessToken: page.access_token,
            },
          }))
        }
        break
      }
      default:
        logger.warn({ platform }, 'OAuth callback for unsupported platform')
    }

    return { organizationId }
  }

  async getPosts(organizationId: string, opts: { status?: string; accountId?: string; page?: number; limit?: number }) {
    const page = opts.page ?? 1
    const limit = opts.limit ?? 20
    const skip = (page - 1) * limit

    const where = {
      organizationId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.accountId ? { socialAccountId: opts.accountId } : {}),
    }

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          socialAccount: { select: { platform: true, accountName: true } },
        },
      }),
      prisma.socialPost.count({ where }),
    ])

    return { posts, total, page, limit }
  }

  async createPost(organizationId: string, accountId: string, post: PostRequest) {
    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, organizationId, isActive: true },
    })
    if (!account) throw new Error('Social account not found or disconnected')

    const socialPost = await prisma.socialPost.create({
      data: {
        organizationId,
        socialAccountId: accountId,
        content: post.content,
        mediaUrls: post.mediaUrls ?? [],
        scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : undefined,
        aiGenerated: post.aiGenerated ?? false,
        status: post.scheduledAt ? 'scheduled' : 'draft',
      },
    })

    if (!post.scheduledAt) {
      // Publish immediately
      await this.publishPost(socialPost.id)
    }

    return socialPost
  }

  async generateAiPost(organizationId: string, opts: {
    platform: Platform
    topic: string
    tone?: string
    includeHashtags?: boolean
  }): Promise<{ content: string }> {
    const platform = opts.platform
    const hashtagNote = opts.includeHashtags ? ' Include 3-5 relevant hashtags.' : ' Do not include hashtags.'
    const toneNote = opts.tone ? ` Tone: ${opts.tone}.` : ''

    const response = await aiService.chat(organizationId, undefined, {
      message: `Write a ${platform} post about: ${opts.topic}.${toneNote}${hashtagNote} Keep it platform-appropriate: ${platform === 'twitter' ? 'under 280 characters' : platform === 'instagram' ? 'engaging with emojis' : 'professional and engaging'}. Return only the post text, nothing else.`,
    })

    return { content: response.content }
  }

  async publishPost(postId: string): Promise<void> {
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    })
    if (!post) throw new Error('Post not found')

    const account = post.socialAccount
    if (!account.accessToken) throw new Error('No access token for account')

    try {
      let platformPostId: string | undefined

      const platform = account.platform.toLowerCase() as Platform

      switch (platform) {
        case 'facebook': {
          const res = await fetch(
            `https://graph.facebook.com/v21.0/${account.accountId}/feed`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: post.content, access_token: account.accessToken }),
            },
          )
          const data = await res.json() as MetaPostResult
          if (data.error) throw new Error(`Meta API: ${data.error.message}`)
          platformPostId = data.id
          break
        }
        case 'instagram': {
          // Step 1: Create media container
          const containerRes = await fetch(
            `https://graph.facebook.com/v21.0/${account.accountId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                caption: post.content,
                image_url: post.mediaUrls[0],
                access_token: account.accessToken,
              }),
            },
          )
          const container = await containerRes.json() as { id?: string; error?: { message: string } }
          if (container.error) throw new Error(`Instagram API: ${container.error.message}`)

          // Step 2: Publish container
          const publishRes = await fetch(
            `https://graph.facebook.com/v21.0/${account.accountId}/media_publish`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: container.id, access_token: account.accessToken }),
            },
          )
          const published = await publishRes.json() as MetaPostResult
          if (published.error) throw new Error(`Instagram publish: ${published.error.message}`)
          platformPostId = published.id
          break
        }
        default:
          logger.warn({ platform }, 'Publishing not yet implemented for platform')
      }

      await prisma.socialPost.update({
        where: { id: postId },
        data: {
          status: 'published',
          publishedAt: new Date(),
          platformPostId,
        },
      })
    } catch (err) {
      await prisma.socialPost.update({
        where: { id: postId },
        data: { status: 'failed', metadata: { error: String(err) } },
      })
      throw err
    }
  }

  async deletePost(organizationId: string, postId: string) {
    const post = await prisma.socialPost.findFirst({ where: { id: postId, organizationId } })
    if (!post) throw new Error('Post not found')
    await prisma.socialPost.delete({ where: { id: postId } })
  }

  async getStats(organizationId: string) {
    const [totalPosts, publishedPosts, scheduledPosts, failedPosts] = await Promise.all([
      prisma.socialPost.count({ where: { organizationId } }),
      prisma.socialPost.count({ where: { organizationId, status: 'published' } }),
      prisma.socialPost.count({ where: { organizationId, status: 'scheduled' } }),
      prisma.socialPost.count({ where: { organizationId, status: 'failed' } }),
    ])

    const accountsByPlatform = await prisma.socialAccount.groupBy({
      by: ['platform'],
      where: { organizationId, isActive: true },
      _count: true,
    })

    return { totalPosts, publishedPosts, scheduledPosts, failedPosts, accountsByPlatform }
  }
}

export const socialService = new SocialService()
