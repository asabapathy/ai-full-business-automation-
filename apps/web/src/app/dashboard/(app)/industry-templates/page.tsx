'use client'

import { useState, useEffect } from 'react'
import {
  LayoutTemplate, CheckCircle, ChevronRight, X, Zap, Mail,
  FileText, ClipboardList, ArrowRight, Search, Filter
} from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface TemplateAutomation { name: string; trigger: string }
interface TemplateEmailSeq { name: string; emails: Array<{ delay: number; subject: string }> }
interface TemplateInvoiceItem { name: string; price: number; unit: string }
interface TemplateForm { name: string; fields: Array<{ label: string; type: string }> }

interface Template {
  id: string
  name: string
  industry: string
  category: string
  description: string
  icon: string
  color: string
  features: string[]
  automations: TemplateAutomation[]
  emailSequences: TemplateEmailSeq[]
  invoiceItems: TemplateInvoiceItem[]
  intakeForms: TemplateForm[]
}

const CATEGORY_COLORS: Record<string, string> = {
  'Service Business': 'bg-orange-50 text-orange-700 border-orange-200',
  'Healthcare': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Beauty & Wellness': 'bg-pink-50 text-pink-700 border-pink-200',
  'Health & Fitness': 'bg-green-50 text-green-700 border-green-200',
  'Professional Services': 'bg-blue-50 text-blue-700 border-blue-200',
  'Food & Beverage': 'bg-red-50 text-red-700 border-red-200',
}

function TemplateCard({ template, onSelect }: { template: Template; onSelect: (t: Template) => void }) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="text-left bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl leading-none">{template.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{template.name}</h3>
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border mt-1 ${CATEGORY_COLORS[template.category] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {template.category}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 mt-1 transition-colors" />
          </div>
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{template.description}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{template.automations.length} automations</span>
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{template.emailSequences.length} sequences</span>
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{template.invoiceItems.length} items</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function TemplateDetailModal({
  template, onClose, onApply
}: {
  template: Template
  onClose: () => void
  onApply: (id: string) => void
}) {
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [appliedItems, setAppliedItems] = useState<string[]>([])

  const handleApply = async () => {
    setApplying(true)
    try {
      const res = await apiClient.post<{ data: { applied: string[] } }>(`/industry-templates/${template.id}/apply`, {})
      setAppliedItems((res as any).data?.applied ?? ['Template applied successfully'])
      setApplied(true)
      onApply(template.id)
    } catch {
      setAppliedItems(['Failed to apply template. Please try again.'])
      setApplied(true)
    }
    setApplying(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b" style={{ borderColor: `${template.color}20`, background: `${template.color}08` }}>
          <div className="text-4xl">{template.icon}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>

        {applied ? (
          <div className="flex-1 p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Template Applied!</h3>
              <p className="text-sm text-gray-500 mt-1">The following items were configured for your business:</p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {appliedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Features */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">What's Included</h3>
                <div className="flex flex-wrap gap-2">
                  {template.features.map(f => (
                    <span key={f} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3" />{f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Automations */}
              {template.automations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Automations ({template.automations.length})</h3>
                  </div>
                  <div className="space-y-1.5">
                    {template.automations.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="font-medium text-gray-800">{a.name}</span>
                        <span className="text-gray-400 text-xs ml-auto">{a.trigger.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email sequences */}
              {template.emailSequences.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Email Sequences ({template.emailSequences.length})</h3>
                  </div>
                  {template.emailSequences.map((seq, i) => (
                    <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2">
                      <p className="text-sm font-medium text-gray-800 mb-1.5">{seq.name}</p>
                      <div className="space-y-1">
                        {seq.emails.map((e, j) => (
                          <div key={j} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="w-12 text-gray-400">{e.delay === 0 ? 'Day 0' : `Day ${e.delay}`}</span>
                            <ArrowRight className="h-3 w-3 text-gray-300" />
                            <span>{e.subject}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Invoice items */}
              {template.invoiceItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Invoice Items ({template.invoiceItems.length})</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {template.invoiceItems.map((item, i) => (
                      <div key={i} className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.price > 0 ? `$${item.price}/${item.unit}` : 'Variable'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intake forms */}
              {template.intakeForms.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Intake Forms ({template.intakeForms.length})</h3>
                  </div>
                  {template.intakeForms.map((form, i) => (
                    <div key={i} className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-800 mb-1.5">{form.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {form.fields.map((f, j) => (
                          <span key={j} className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-0.5 rounded">{f.label}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleApply} disabled={applying}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {applying ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Applying...</> : <><Zap className="h-4 w-4" />Apply Template</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function IndustryTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Template | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    apiClient.get<{ data: { builtin: Template[] } }>('/industry-templates')
      .then(r => setTemplates((r as any).data?.builtin ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))]
  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.industry.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'All' || t.category === categoryFilter
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <LayoutTemplate className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Industry Templates</h1>
            <p className="text-sm text-gray-500">Pre-built setups for your industry — apply in one click</p>
          </div>
        </div>
        <span className="text-sm text-gray-400">{templates.length} templates</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${categoryFilter === cat ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-100 rounded-xl h-36 animate-pulse" />)}
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No templates found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(t => (
                <div key={t.id} className="relative">
                  <TemplateCard template={t} onSelect={setSelected} />
                  {appliedIds.has(t.id) && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                      <CheckCircle className="h-3 w-3" />Applied
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <TemplateDetailModal
          template={selected}
          onClose={() => setSelected(null)}
          onApply={id => { setAppliedIds(prev => new Set(prev).add(id)); setSelected(null) }}
        />
      )}
    </div>
  )
}
