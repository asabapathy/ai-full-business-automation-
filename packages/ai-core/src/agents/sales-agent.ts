import type { AITool, AgentContext } from '@kanavu/types'
import { BaseAgent, type AgentConfig } from './base-agent.js'

const SALES_SYSTEM_PROMPT = `You are the AI Sales Assistant for Kanavu AI — an expert sales strategist and closer.

## Your Expertise
- Lead qualification and scoring
- Personalized follow-up sequences (email, SMS, phone scripts)
- Quote and proposal generation
- Deal pipeline management and forecasting
- Objection handling scripts
- Win-back campaigns for lost deals
- Upsell and cross-sell strategies

## Your Approach
1. Qualify leads based on budget, authority, need, and timeline (BANT)
2. Personalize every touchpoint based on the prospect's specific situation
3. Follow up persistently but respectfully — timing matters
4. Generate compelling, value-focused proposals and quotes
5. Identify risks in the pipeline early and suggest corrective actions
6. Celebrate wins and learn from losses

## Communication Style
- Professional but warm and human
- Focus on value and outcomes, not features
- Address objections head-on with empathy
- Use social proof and case studies when relevant
- Clear, specific calls to action in every message`

export class SalesAgent extends BaseAgent {
  readonly agentName = 'Sales Assistant'

  constructor(config: AgentConfig, context: AgentContext) {
    super(config, context)
  }

  get systemPrompt(): string {
    return SALES_SYSTEM_PROMPT
  }

  get tools(): AITool[] {
    return [
      {
        name: 'qualify_lead',
        description: 'Score and qualify a lead based on BANT criteria',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            budget: { type: 'string', description: 'Known or estimated budget' },
            authority: { type: 'string', description: 'Decision-maker level' },
            need: { type: 'string', description: 'Pain points and requirements' },
            timeline: { type: 'string', description: 'Purchase timeline' },
          },
          required: ['need'],
        },
      },
      {
        name: 'create_follow_up_sequence',
        description: 'Generate a multi-touch follow-up sequence for a lead',
        inputSchema: {
          type: 'object',
          properties: {
            contactName: { type: 'string' },
            dealStage: { type: 'string', enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation'] },
            channel: { type: 'string', enum: ['email', 'sms', 'mixed'] },
            touchpoints: { type: 'number', description: 'Number of follow-up touchpoints' },
            objective: { type: 'string', description: 'Goal of this sequence' },
          },
          required: ['dealStage', 'channel'],
        },
      },
      {
        name: 'generate_quote',
        description: 'Generate a professional quote or proposal',
        inputSchema: {
          type: 'object',
          properties: {
            clientName: { type: 'string' },
            services: { type: 'array', items: { type: 'object' }, description: 'Services to include' },
            validDays: { type: 'number', description: 'Quote validity in days' },
            notes: { type: 'string', description: 'Special terms or notes' },
          },
          required: ['clientName', 'services'],
        },
      },
      {
        name: 'forecast_deal',
        description: 'Forecast deal close probability and expected revenue',
        inputSchema: {
          type: 'object',
          properties: {
            dealId: { type: 'string' },
            dealValue: { type: 'number' },
            stage: { type: 'string' },
            daysSinceLastActivity: { type: 'number' },
            competitorsInvolved: { type: 'boolean' },
          },
          required: ['dealValue', 'stage'],
        },
      },
      {
        name: 'suggest_next_action',
        description: 'Suggest the best next action for a stalled deal',
        inputSchema: {
          type: 'object',
          properties: {
            dealContext: { type: 'string', description: 'Current deal situation' },
            lastInteraction: { type: 'string', description: 'What happened last' },
            blockers: { type: 'string', description: 'Known obstacles' },
          },
          required: ['dealContext'],
        },
      },
    ]
  }

  protected async handleToolCall(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'qualify_lead': return this.qualifyLead(input)
      case 'create_follow_up_sequence': return this.createFollowUpSequence(input)
      case 'generate_quote': return this.generateQuote(input)
      case 'forecast_deal': return this.forecastDeal(input)
      case 'suggest_next_action': return this.suggestNextAction(input)
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }

  private async qualifyLead(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const scores = {
      budget: input['budget'] ? 25 : 0,
      authority: input['authority']?.toString().toLowerCase().includes('owner') || input['authority']?.toString().toLowerCase().includes('ceo') ? 25 : 15,
      need: input['need'] ? 30 : 0,
      timeline: input['timeline']?.toString().toLowerCase().includes('immediate') || input['timeline']?.toString().toLowerCase().includes('month') ? 20 : 10,
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0)

    return {
      score: total,
      grade: total >= 80 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D',
      qualified: total >= 60,
      breakdown: scores,
      recommendation: total >= 60
        ? 'High-priority lead — move to proposal stage'
        : 'Nurture with educational content before advancing',
    }
  }

  private async createFollowUpSequence(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const touchpoints = (input['touchpoints'] as number) ?? 5
    return {
      sequenceId: crypto.randomUUID(),
      contactName: input['contactName'] ?? 'Prospect',
      channel: input['channel'],
      dealStage: input['dealStage'],
      touchpoints: Array.from({ length: touchpoints }, (_, i) => ({
        step: i + 1,
        timing: `Day ${[1, 3, 7, 14, 21][i] ?? i * 7}`,
        channel: input['channel'] === 'mixed' ? (i % 2 === 0 ? 'email' : 'sms') : input['channel'],
        purpose: ['Initial outreach', 'Value add follow-up', 'Check-in', 'Offer', 'Final attempt'][i] ?? 'Follow-up',
      })),
      status: 'draft',
    }
  }

  private async generateQuote(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const services = (input['services'] as Array<{ name: string; price: number; qty?: number }>) ?? []
    const subtotal = services.reduce((sum, s) => sum + (s.price * (s.qty ?? 1)), 0)
    const tax = subtotal * 0.1
    return {
      quoteId: crypto.randomUUID(),
      quoteNumber: `QT-${Date.now().toString().slice(-6)}`,
      clientName: input['clientName'],
      services,
      subtotal,
      tax,
      total: subtotal + tax,
      validUntil: new Date(Date.now() + ((input['validDays'] as number ?? 30) * 24 * 60 * 60 * 1000)).toISOString(),
      status: 'draft',
    }
  }

  private async forecastDeal(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const stageProbabilities: Record<string, number> = {
      LEAD: 0.1, NEW: 0.15, CONTACTED: 0.25, QUALIFIED: 0.4,
      PROPOSAL_SENT: 0.6, NEGOTIATION: 0.8, WON: 1.0, LOST: 0,
    }
    const stage = (input['stage'] as string)?.toUpperCase() ?? 'NEW'
    const baseProbability = stageProbabilities[stage] ?? 0.3
    const daysPenalty = Math.min(0.3, ((input['daysSinceLastActivity'] as number) ?? 0) * 0.01)
    const competitorPenalty = (input['competitorsInvolved'] as boolean) ? 0.1 : 0
    const probability = Math.max(0.05, baseProbability - daysPenalty - competitorPenalty)

    return {
      probability: Math.round(probability * 100),
      expectedRevenue: Math.round((input['dealValue'] as number ?? 0) * probability),
      riskLevel: probability < 0.3 ? 'high' : probability < 0.6 ? 'medium' : 'low',
      daysToClose: Math.round((1 - probability) * 60),
    }
  }

  private async suggestNextAction(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      primaryAction: {
        type: 'call',
        description: `Schedule a discovery call to understand ${(input['blockers'] as string) ?? 'current blockers'}`,
        timing: 'Within 24 hours',
        script: `"Hi, I wanted to follow up on [deal]. I noticed [last interaction]. I have a quick idea that might help — do you have 15 minutes this week?"`,
      },
      alternativeActions: [
        { type: 'email', description: 'Send a relevant case study', timing: 'If call not answered' },
        { type: 'sms', description: 'Brief check-in text', timing: '3 days after email' },
      ],
      context: input['dealContext'],
    }
  }
}
