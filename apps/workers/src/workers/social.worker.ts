import { Worker, type Job } from 'bullmq'
import { prisma } from '@kanavu/database'
import { redis } from '../redis.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import type { SocialJobData } from '../queues.js'

async function publishToFacebook(post: SocialJobData, accessToken: string): Promise<void> {
  const resp = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: post.content, access_token: accessToken }),
  })
  if (!resp.ok) throw new Error(`Facebook publish failed: ${await resp.text()}`)
}

async function publishToLinkedIn(post: SocialJobData, accessToken: string, personUrn: string): Promise<void> {
  const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: post.content }, shareMediaCategory: 'NONE' } },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  if (!resp.ok) throw new Error(`LinkedIn publish failed: ${await resp.text()}`)
}

export function createSocialWorker() {
  const worker = new Worker<SocialJobData>(
    'social',
    async (job: Job<SocialJobData>) => {
      const { organizationId, postId, platform, content } = job.data
      logger.info({ jobId: job.id, platform, postId }, 'Processing social post')

      const socialAccount = await prisma.socialAccount.findFirst({
        where: { organizationId, platform: platform.toUpperCase() as never, isActive: true },
        select: { accessToken: true, accountId: true, metadata: true },
      })

      if (!socialAccount?.accessToken) {
        logger.warn({ platform }, 'No active social account found')
        await prisma.contentPost.update({ where: { id: postId }, data: { status: 'FAILED' } }).catch(() => {})
        return
      }

      try {
        if (platform === 'facebook' || platform === 'SOCIAL_FACEBOOK') {
          await publishToFacebook(job.data, socialAccount.accessToken)
        } else if (platform === 'linkedin' || platform === 'SOCIAL_LINKEDIN') {
          const meta = (socialAccount.metadata as Record<string, string>) ?? {}
          await publishToLinkedIn(job.data, socialAccount.accessToken, meta['personUrn'] ?? `urn:li:person:${socialAccount.accountId}`)
        }
        await prisma.contentPost.update({ where: { id: postId }, data: { status: 'PUBLISHED', publishedAt: new Date() } }).catch(() => {})
        logger.info({ jobId: job.id, platform }, 'Social post published')
      } catch (err) {
        await prisma.contentPost.update({ where: { id: postId }, data: { status: 'FAILED' } }).catch(() => {})
        throw err
      }
    },
    {
      connection: redis,
      concurrency: config.CONCURRENCY,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Social job failed')
  })

  return worker
}
