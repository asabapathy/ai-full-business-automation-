import nodemailer from 'nodemailer'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

function buildTransport() {
  if (config.SMTP_HOST) {
    return nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT ?? 587,
      secure: (config.SMTP_PORT ?? 587) === 465,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    })
  }

  // Ethereal.email dev fallback — works without any config
  return nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user: 'kanavu@ethereal.email', pass: 'ethereal' } })
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!config.SMTP_HOST && !config.RESEND_API_KEY) {
    logger.debug({ to: payload.to, subject: payload.subject }, 'email: no transport configured, skipping send')
    return false
  }

  if (config.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
          to: Array.isArray(payload.to) ? payload.to : [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      })
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
      logger.info({ to: payload.to, subject: payload.subject }, 'email: sent via Resend')
      return true
    } catch (err) {
      logger.error({ err }, 'email: Resend send failed')
      return false
    }
  }

  try {
    const transport = buildTransport()
    await transport.sendMail({
      from: `"${config.FROM_NAME}" <${config.FROM_EMAIL}>`,
      to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    logger.info({ to: payload.to, subject: payload.subject }, 'email: sent via SMTP')
    return true
  } catch (err) {
    logger.error({ err }, 'email: SMTP send failed')
    return false
  }
}

// ── Template builders ─────────────────────────────────────────────────────────

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0f1e;font-family:system-ui,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="margin-bottom:32px">
    <span style="font-size:20px;font-weight:700;color:#06b6d4">Kanavu AI</span>
  </div>
  <div style="background:#111827;border:1px solid #1e293b;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f8fafc">${title}</h1>
    ${body}
  </div>
  <p style="margin-top:24px;font-size:12px;color:#475569;text-align:center">
    Kanavu AI · You received this because you have an active account.<br>
    <a href="{{unsubscribeUrl}}" style="color:#475569">Unsubscribe</a>
  </p>
</div></body></html>`
}

export function buildTrialExpiryEmail(opts: { orgName: string; daysLeft: number; upgradeUrl: string }) {
  const { orgName, daysLeft, upgradeUrl } = opts
  const urgent = daysLeft <= 2

  const bodyHtml = `
    <p style="margin:0 0 12px;color:#94a3b8;font-size:15px">Hi ${orgName} team,</p>
    <p style="margin:0 0 20px;color:#94a3b8;font-size:15px">
      ${daysLeft === 0
        ? 'Your free trial has ended. Your account has been downgraded to the Starter plan.'
        : `Your free trial ends in <strong style="color:${urgent ? '#f87171' : '#fbbf24'}">${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>. After that, you'll be on our Starter plan.`
      }
    </p>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px">Upgrade now to keep all Business features — AI Brain, social media, advanced analytics, and more.</p>
    <a href="${upgradeUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#06b6d4,#0ea5e9);color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
      Upgrade to keep your features →
    </a>
    <p style="margin-top:24px;font-size:13px;color:#475569">Questions? Reply to this email and we'll help you out.</p>
  `

  return {
    subject: daysLeft === 0
      ? `Your Kanavu AI trial has ended — ${orgName}`
      : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on your Kanavu AI trial`,
    html: emailWrapper(daysLeft === 0 ? 'Your trial has ended' : `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, bodyHtml),
    text: `Your Kanavu AI trial ${daysLeft === 0 ? 'has ended' : `ends in ${daysLeft} days`}. Upgrade at: ${upgradeUrl}`,
  }
}

export function buildTeamInviteEmail(opts: { inviterName: string; orgName: string; inviteUrl: string }) {
  const { inviterName, orgName, inviteUrl } = opts
  const bodyHtml = `
    <p style="margin:0 0 12px;color:#94a3b8;font-size:15px">${inviterName} has invited you to join <strong style="color:#f8fafc">${orgName}</strong> on Kanavu AI.</p>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px">Kanavu AI is an all-in-one AI business platform — CRM, appointments, invoicing, AI receptionist, and more.</p>
    <a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#06b6d4,#0ea5e9);color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
      Accept invitation →
    </a>
    <p style="margin-top:24px;font-size:13px;color:#475569">This invite expires in 7 days. If you didn't expect this, you can ignore this email.</p>
  `

  return {
    subject: `${inviterName} invited you to ${orgName} on Kanavu AI`,
    html: emailWrapper(`You're invited to join ${orgName}`, bodyHtml),
    text: `${inviterName} invited you to ${orgName} on Kanavu AI. Accept at: ${inviteUrl}`,
  }
}
