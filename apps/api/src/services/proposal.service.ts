import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

interface ProposalLineItem { description: string; quantity: number; unitPrice: number }

export class ProposalService {
  async generateProposal(orgId: string, data: {
    contactId: string
    dealId?: string
    title: string
    context: string
    lineItems?: ProposalLineItem[]
  }) {
    const contact = await prisma.contact.findUnique({ where: { id: data.contactId }, select: { firstName: true, lastName: true, email: true } })
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } })
    if (!contact || !org) throw new Error('Contact or org not found')

    const lineItemsText = data.lineItems?.map(li => `- ${li.description}: ${li.quantity} × $${li.unitPrice}`).join('\n') ?? 'To be determined'
    const total = data.lineItems?.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0) ?? 0

    const aiResp = await aiService.chat(orgId, undefined, {
      message: `Write a professional business proposal for ${contact.firstName} ${contact.lastName} from ${org.name}.
Title: ${data.title}
Context: ${data.context}
Line Items:
${lineItemsText}

Write in a professional, persuasive tone. Include: Executive Summary, Scope of Work, Deliverables, Investment, and Next Steps. Format as HTML with clean inline styles.`,
    })

    const htmlContent = this.wrapProposalHtml(aiResp.content, data.title, org.name, contact.firstName + ' ' + contact.lastName, total, data.lineItems)

    return prisma.proposal.create({
      data: {
        organizationId: orgId,
        contactId: data.contactId,
        dealId: data.dealId,
        title: data.title,
        content: aiResp.content,
        htmlContent,
        totalAmount: total,
        status: 'DRAFT',
        validUntil: new Date(Date.now() + 30 * 86_400_000),
        metadata: { lineItems: data.lineItems ?? [] },
      },
    })
  }

  async getProposals(orgId: string) {
    return prisma.proposal.findMany({
      where: { organizationId: orgId },
      include: { contact: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async getProposal(orgId: string, id: string) {
    return prisma.proposal.findFirst({
      where: { id, organizationId: orgId },
      include: { contact: { select: { firstName: true, lastName: true, email: true } } },
    })
  }

  async getProposalByToken(token: string) {
    return prisma.proposal.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true, logoUrl: true, email: true, phone: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
      },
    })
  }

  async sendProposal(orgId: string, id: string): Promise<void> {
    const proposal = await prisma.proposal.findFirst({
      where: { id, organizationId: orgId },
      include: { contact: { select: { email: true, firstName: true } }, organization: { select: { name: true } } },
    })
    if (!proposal?.contact?.email) throw new Error('No contact email')

    const webBase = process.env['WEB_URL'] ?? 'http://localhost:3000'
    const url = `${webBase}/proposals/${proposal.token}`

    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h2>Hi ${proposal.contact.firstName},</h2>
<p>${proposal.organization.name} has prepared a proposal for you: <strong>${proposal.title}</strong></p>
<a href="${url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">View Proposal</a>
<p style="color:#64748b;font-size:14px">Valid for 30 days. Click above to review and sign.</p>
</div>`

    try {
      const { EmailService } = await import('@kanavu/integrations')
      const emailSvc = EmailService.fromEnv() as { sendRaw?: (o: { to: string; subject: string; html: string }) => Promise<void> }
      await emailSvc.sendRaw?.({ to: proposal.contact.email, subject: `Proposal: ${proposal.title}`, html })
    } catch {}

    await prisma.proposal.update({ where: { id }, data: { status: 'SENT' } })
  }

  async signProposal(token: string, data: { signerName: string; signerEmail: string; signatureData: string }): Promise<void> {
    await prisma.proposal.update({
      where: { token },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signerName: data.signerName,
        signerEmail: data.signerEmail,
        signatureData: data.signatureData,
      },
    })
  }

  async deleteProposal(orgId: string, id: string): Promise<void> {
    await prisma.proposal.deleteMany({ where: { id, organizationId: orgId } })
  }

  private wrapProposalHtml(content: string, title: string, businessName: string, clientName: string, total: number, lineItems?: ProposalLineItem[]): string {
    const fmtCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    const lineItemsHtml = lineItems && lineItems.length > 0 ? `
<table style="width:100%;border-collapse:collapse;margin:24px 0">
  <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0">Item</th><th style="text-align:right;padding:8px;border:1px solid #e2e8f0">Qty</th><th style="text-align:right;padding:8px;border:1px solid #e2e8f0">Unit Price</th><th style="text-align:right;padding:8px;border:1px solid #e2e8f0">Total</th></tr></thead>
  <tbody>${lineItems.map(li => `<tr><td style="padding:8px;border:1px solid #e2e8f0">${li.description}</td><td style="text-align:right;padding:8px;border:1px solid #e2e8f0">${li.quantity}</td><td style="text-align:right;padding:8px;border:1px solid #e2e8f0">${fmtCurrency(li.unitPrice)}</td><td style="text-align:right;padding:8px;border:1px solid #e2e8f0">${fmtCurrency(li.quantity * li.unitPrice)}</td></tr>`).join('')}</tbody>
  <tfoot><tr style="font-weight:bold;background:#f8fafc"><td colspan="3" style="padding:8px;border:1px solid #e2e8f0;text-align:right">Total Investment</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#6366f1">${fmtCurrency(total)}</td></tr></tfoot>
</table>` : ''

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:32px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;border-bottom:2px solid #6366f1;padding-bottom:16px">
  <div><h1 style="color:#6366f1;margin:0;font-size:28px">${businessName}</h1></div>
  <div style="text-align:right"><p style="margin:0;color:#64748b">Prepared for</p><p style="margin:0;font-weight:600">${clientName}</p></div>
</div>
<h2 style="color:#0f172a">${title}</h2>
${lineItemsHtml}
<div style="background:#f8fafc;border-left:4px solid #6366f1;padding:16px;margin:24px 0">
${content.replace(/\n/g, '<br>')}
</div>
<div style="border-top:1px solid #e2e8f0;margin-top:32px;padding-top:24px">
  <p style="color:#64748b;font-size:14px">Signature: _________________________ &nbsp;&nbsp; Date: _____________</p>
  <p style="color:#64748b;font-size:12px">By signing, you accept the terms outlined in this proposal.</p>
</div>
</body></html>`
  }
}

export const proposalService = new ProposalService()
