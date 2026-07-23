import type { AITool, AgentContext } from '@kanavu/types'
import { BaseAgent, type AgentConfig } from './base-agent.js'

const FINANCE_SYSTEM_PROMPT = `You are the AI Finance Manager for Kanavu AI — an expert in small business financial operations.

## Your Expertise
- Invoice creation and automation
- Payment reminder sequences (polite → firm → final notice)
- Cash flow forecasting and analysis
- Expense categorization and insights
- Financial health reporting
- Late payment recovery
- Subscription and recurring billing management

## Your Approach
1. Keep cash flow healthy — proactively alert on overdue invoices
2. Automate repetitive billing tasks to save time
3. Provide clear, actionable financial insights
4. Handle collections professionally and diplomatically
5. Identify cost savings and revenue optimization opportunities
6. Make financial data understandable for non-accountants

## Communication Style
- Clear and professional for financial communications
- Empathetic but firm for payment reminders
- Translate financial jargon into plain language
- Proactive rather than reactive on financial health`

export class FinanceAgent extends BaseAgent {
  readonly agentName = 'Finance Manager'

  constructor(config: AgentConfig, context: AgentContext) {
    super(config, context)
  }

  get systemPrompt(): string {
    return FINANCE_SYSTEM_PROMPT
  }

  get tools(): AITool[] {
    return [
      {
        name: 'create_invoice',
        description: 'Generate a professional invoice for a client',
        inputSchema: {
          type: 'object',
          properties: {
            clientName: { type: 'string' },
            clientEmail: { type: 'string' },
            lineItems: { type: 'array', items: { type: 'object' } },
            dueDate: { type: 'string', description: 'ISO date string' },
            notes: { type: 'string' },
            taxRate: { type: 'number', description: 'Tax rate as decimal (e.g. 0.1 for 10%)' },
          },
          required: ['clientName', 'lineItems'],
        },
      },
      {
        name: 'send_payment_reminder',
        description: 'Generate a payment reminder message for an overdue invoice',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string' },
            clientName: { type: 'string' },
            amount: { type: 'number' },
            daysOverdue: { type: 'number' },
            channel: { type: 'string', enum: ['email', 'sms'] },
            reminderNumber: { type: 'number', description: '1=gentle, 2=firm, 3=final notice' },
          },
          required: ['clientName', 'amount', 'daysOverdue'],
        },
      },
      {
        name: 'analyze_cash_flow',
        description: 'Analyze cash flow and forecast next 30/60/90 days',
        inputSchema: {
          type: 'object',
          properties: {
            currentBalance: { type: 'number' },
            monthlyRevenue: { type: 'number' },
            monthlyExpenses: { type: 'number' },
            outstandingReceivables: { type: 'number' },
            upcomingPayables: { type: 'number' },
          },
          required: ['monthlyRevenue', 'monthlyExpenses'],
        },
      },
      {
        name: 'categorize_expense',
        description: 'Categorize and tag an expense for accounting purposes',
        inputSchema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Expense description or merchant name' },
            amount: { type: 'number' },
            date: { type: 'string' },
          },
          required: ['description', 'amount'],
        },
      },
      {
        name: 'generate_financial_report',
        description: 'Generate a financial health summary report',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
            includeForecasts: { type: 'boolean' },
          },
          required: ['period'],
        },
      },
    ]
  }

  protected async handleToolCall(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'create_invoice': return this.createInvoice(input)
      case 'send_payment_reminder': return this.sendPaymentReminder(input)
      case 'analyze_cash_flow': return this.analyzeCashFlow(input)
      case 'categorize_expense': return this.categorizeExpense(input)
      case 'generate_financial_report': return this.generateFinancialReport(input)
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }

  private async createInvoice(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const lineItems = input['lineItems'] as Array<{ description: string; quantity: number; unitPrice: number }>
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const taxRate = (input['taxRate'] as number) ?? 0
    const tax = subtotal * taxRate
    return {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      clientName: input['clientName'],
      clientEmail: input['clientEmail'],
      lineItems,
      subtotal,
      tax,
      total: subtotal + tax,
      dueDate: input['dueDate'] ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
  }

  private async sendPaymentReminder(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const daysOverdue = input['daysOverdue'] as number
    const reminderNum = (input['reminderNumber'] as number) ?? (daysOverdue > 30 ? 3 : daysOverdue > 14 ? 2 : 1)
    const tones = ['gentle', 'firm', 'final_notice']
    const tone = tones[reminderNum - 1] ?? 'firm'
    return {
      channel: input['channel'] ?? 'email',
      tone,
      subject: reminderNum === 1
        ? `Friendly reminder: Invoice payment due`
        : reminderNum === 2
          ? `Invoice overdue — action required`
          : `Final notice: Immediate payment required`,
      preview: `Hi ${input['clientName']}, this is a ${tone.replace('_', ' ')} reminder about your outstanding balance of $${(input['amount'] as number).toFixed(2)}.`,
      daysOverdue,
      escalationPath: reminderNum < 3 ? `Next reminder in ${daysOverdue < 14 ? 7 : 14} days` : 'Consider collections',
    }
  }

  private async analyzeCashFlow(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const revenue = input['monthlyRevenue'] as number
    const expenses = input['monthlyExpenses'] as number
    const netMonthly = revenue - expenses
    const balance = (input['currentBalance'] as number) ?? 0
    const receivables = (input['outstandingReceivables'] as number) ?? 0

    return {
      currentBalance: balance,
      monthlyNetFlow: netMonthly,
      runway: netMonthly < 0 ? Math.round(balance / Math.abs(netMonthly)) : null,
      forecast: {
        '30days': balance + netMonthly + receivables * 0.7,
        '60days': balance + netMonthly * 2 + receivables * 0.9,
        '90days': balance + netMonthly * 3 + receivables,
      },
      healthScore: netMonthly > 0 && balance > expenses * 2 ? 'excellent' : netMonthly > 0 ? 'good' : 'needs_attention',
      alerts: [
        netMonthly < 0 ? 'Negative cash flow — review expenses immediately' : null,
        balance < expenses ? 'Low cash reserves — less than 1 month of expenses' : null,
        receivables > revenue * 2 ? 'High outstanding receivables — accelerate collections' : null,
      ].filter(Boolean),
    }
  }

  private async categorizeExpense(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const description = (input['description'] as string).toLowerCase()
    const categories: Record<string, string[]> = {
      'Software & Tools': ['software', 'subscription', 'saas', 'app', 'tool', 'license'],
      'Marketing & Advertising': ['ads', 'marketing', 'facebook', 'google', 'advertising'],
      'Office Supplies': ['office', 'supplies', 'stationery', 'paper'],
      'Travel & Transportation': ['uber', 'lyft', 'gas', 'travel', 'flight', 'hotel'],
      'Meals & Entertainment': ['restaurant', 'food', 'coffee', 'lunch', 'dinner', 'meal'],
      'Professional Services': ['consulting', 'legal', 'accounting', 'lawyer'],
      'Utilities': ['electric', 'water', 'internet', 'phone', 'utility'],
    }
    const category = Object.entries(categories).find(([, keywords]) =>
      keywords.some(kw => description.includes(kw))
    )?.[0] ?? 'Other'

    return {
      category,
      taxDeductible: !['Meals & Entertainment'].includes(category),
      amount: input['amount'],
      description: input['description'],
      date: input['date'] ?? new Date().toISOString(),
    }
  }

  private async generateFinancialReport(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      period: input['period'],
      generatedAt: new Date().toISOString(),
      sections: ['Revenue Summary', 'Expense Breakdown', 'Cash Flow', 'Outstanding Invoices', 'Profit & Loss'],
      status: 'report_queued',
      estimatedReadyIn: '30 seconds',
      includesForecasts: input['includeForecasts'] ?? false,
    }
  }
}
