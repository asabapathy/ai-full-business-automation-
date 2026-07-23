export interface CreateContactRequest {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  type?: string
  companyId?: string
  source?: string
  tags?: string[]
  customFields?: Record<string, unknown>
  notes?: string
}

export interface UpdateContactRequest extends Partial<CreateContactRequest> {
  status?: string
  score?: number
  ownerId?: string
}

export interface CreateDealRequest {
  title: string
  contactId?: string
  companyId?: string
  value?: number
  stage?: string
  probability?: number
  expectedCloseDate?: string
  notes?: string
}

export interface CreateInvoiceRequest {
  contactId?: string
  lineItems: LineItem[]
  dueAt?: string
  notes?: string
  terms?: string
}

export interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  taxRate?: number
  discount?: number
}
