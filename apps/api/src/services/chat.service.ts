import { Response } from 'express'
import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

export class ChatService {
  async getOrCreateSession(orgId: string, visitorId: string, channel = 'widget'): Promise<string> {
    const existing = await prisma.chatSession.findFirst({
      where: { organizationId: orgId, visitorId, status: 'active', channel },
      orderBy: { startedAt: 'desc' },
    })
    if (existing) return existing.id

    const session = await prisma.chatSession.create({
      data: { organizationId: orgId, visitorId, channel },
    })
    return session.id
  }

  async getSessionMessages(sessionId: string) {
    return prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    })
  }

  async streamChatResponse(
    orgId: string,
    sessionId: string,
    userMessage: string,
    res: Response,
  ): Promise<void> {
    // Store user message
    await prisma.chatMessage.create({
      data: { sessionId, role: 'user', content: userMessage },
    })

    // Get history for context (last 10 messages)
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    })
    history.reverse()

    const historyText = history
      .slice(0, -1) // exclude the message we just inserted
      .map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
      .join('\n')

    const prompt = historyText
      ? `Previous conversation:\n${historyText}\n\nCustomer: ${userMessage}`
      : userMessage

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    let fullContent = ''
    try {
      const response = await aiService.chat(orgId, undefined, { message: prompt })
      fullContent = response.content
      // Stream word-by-word for a natural feel
      const words = fullContent.split(' ')
      for (const word of words) {
        const chunk = word + ' '
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        await new Promise(r => setTimeout(r, 20))
      }
    } catch {
      const fallback = "I'm here to help! Could you please clarify your question?"
      fullContent = fallback
      res.write(`data: ${JSON.stringify({ chunk: fallback })}\n\n`)
    }

    // Persist assistant response
    await prisma.chatMessage.create({
      data: { sessionId, role: 'assistant', content: fullContent },
    }).catch(() => {})

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  }

  async captureVisitorInfo(sessionId: string, data: { name?: string; email?: string; phone?: string }): Promise<void> {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        visitorName: data.name,
        visitorEmail: data.email,
      },
    })
  }

  async closeSession(sessionId: string): Promise<void> {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'closed', endedAt: new Date() },
    })
  }

  async getSessions(orgId: string, status?: string) {
    return prisma.chatSession.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })
  }

  getWidgetScript(orgSlug: string): string {
    const apiBase = process.env['API_URL'] ?? 'http://localhost:4000/api/v1'
    const webBase = process.env['WEB_URL'] ?? 'http://localhost:3000'
    return `(function(){
  var slug="${orgSlug}";
  var base="${webBase}";
  var btn=document.createElement("div");
  btn.id="kanavu-chat-btn";
  btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  btn.style.cssText="position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.4);z-index:9998;";
  var iframe=document.createElement("iframe");
  iframe.src=base+"/chat/"+slug;
  iframe.style.cssText="position:fixed;bottom:96px;right:24px;width:380px;height:560px;border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.2);z-index:9999;display:none;";
  iframe.id="kanavu-chat-frame";
  btn.onclick=function(){iframe.style.display=iframe.style.display==="none"?"block":"none";};
  document.body.appendChild(iframe);
  document.body.appendChild(btn);
})();`
  }
}

export const chatService = new ChatService()
