'use client'

import { useState } from 'react'
import { BookOpen, Zap, Copy, CheckCircle, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../../../lib/api-client'

interface BlogPost {
  title: string
  content: string
  metaDescription: string
  tags: string[]
  wordCount: number
  readingTime: number
}

const BLOG_TEMPLATES = [
  { label: 'How-To Guide', icon: '📝', prompt: 'Write a comprehensive how-to guide about {topic} for {audience}. Include step-by-step instructions, tips, and a FAQ section.' },
  { label: 'Top 10 List', icon: '🔟', prompt: 'Write a "Top 10" listicle about {topic} for {audience}. Make each point detailed and actionable with real-world examples.' },
  { label: 'Problem & Solution', icon: '🔧', prompt: 'Write a blog post addressing the common problem of {topic} for {audience}. Explain the problem, its impacts, and provide detailed solutions.' },
  { label: 'Industry Trends', icon: '📈', prompt: 'Write an insightful blog post about the latest trends in {topic} for {audience}. Include data points, expert insights, and future predictions.' },
  { label: 'Case Study', icon: '📊', prompt: 'Write a compelling case study about {topic} for {audience}. Include background, challenges, solution, results, and key takeaways.' },
  { label: 'FAQ Post', icon: '❓', prompt: 'Write a comprehensive FAQ blog post about {topic} for {audience}. Cover the 10 most common questions with detailed, helpful answers.' },
]

const TONE_OPTIONS = ['Professional', 'Conversational', 'Educational', 'Persuasive', 'Friendly', 'Expert']
const WORD_COUNT_OPTIONS = [500, 800, 1200, 1500, 2000]

export default function BlogWriterPage() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [keyword, setKeyword] = useState('')
  const [tone, setTone] = useState('Professional')
  const [wordCount, setWordCount] = useState(800)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof BLOG_TEMPLATES[0] | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [post, setPost] = useState<BlogPost | null>(null)
  const [copied, setCopied] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [websiteId, setWebsiteId] = useState('')

  const generate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setPost(null)

    try {
      const prompt = selectedTemplate
        ? selectedTemplate.prompt.replace('{topic}', topic).replace('{audience}', audience || 'general readers')
        : customPrompt || `Write a ${tone.toLowerCase()} blog post about "${topic}" targeting ${audience || 'general readers'}. Focus on SEO keyword: "${keyword || topic}". Word count: approximately ${wordCount} words.`

      const res = await api.post<{ content: string; title?: string }>(`/website/${websiteId || 'default'}/blog/generate`, {
        topic,
        targetKeyword: keyword || topic,
        wordCount,
        audience,
        tone,
        prompt,
      })

      const content = res.content ?? ''
      const lines = content.split('\n')
      const title = res.title ?? (lines[0]?.replace(/^#+\s*/, '') ?? topic)
      const bodyLines = lines.slice(title === lines[0]?.replace(/^#+\s*/, '') ? 1 : 0)
      const bodyContent = bodyLines.join('\n').trim()
      const words = bodyContent.split(/\s+/).length

      setPost({
        title,
        content: bodyContent,
        metaDescription: bodyContent.slice(0, 160).replace(/\n/g, ' '),
        tags: [topic, keyword, audience].filter(Boolean).slice(0, 5),
        wordCount: words,
        readingTime: Math.ceil(words / 200),
      })
    } catch {
      // Demo fallback
      const demoContent = `## Introduction

${topic} is one of the most important topics for ${audience || 'businesses'} today. In this comprehensive guide, we'll explore everything you need to know to succeed.

## Why ${topic} Matters

Understanding ${topic} can transform your business operations. Here are the key reasons why:

1. **Efficiency gains**: Implementing proper ${topic} strategies can save hours every week
2. **Cost reduction**: Smart ${topic} practices reduce overhead by up to 40%
3. **Competitive advantage**: Businesses that master ${topic} outperform their competitors

## Key Strategies for Success

### Strategy 1: Start with the Basics
Before diving into advanced techniques, make sure you have a solid foundation. This means understanding the core principles of ${topic} and how they apply to your specific situation.

### Strategy 2: Measure What Matters
Track the metrics that actually drive results. For ${topic}, the key metrics include:
- Conversion rate
- Customer satisfaction score
- Return on investment (ROI)
- Time to implementation

### Strategy 3: Iterate and Improve
The best practitioners of ${topic} never stop learning. Set up regular review cycles and adjust your approach based on data.

## Common Mistakes to Avoid

Many ${audience || 'businesses'} fall into these traps when dealing with ${topic}:

- **Mistake 1**: Trying to do everything at once instead of starting small
- **Mistake 2**: Not documenting processes and lessons learned
- **Mistake 3**: Ignoring customer feedback in the implementation process

## Getting Started Today

Ready to implement ${topic} in your business? Here's your action plan for the next 30 days:

**Week 1**: Audit your current approach and identify gaps
**Week 2**: Develop your strategy and set measurable goals
**Week 3**: Begin implementation with a pilot program
**Week 4**: Review results and adjust your approach

## Conclusion

${topic} doesn't have to be complicated. With the right strategy and consistent execution, any ${audience || 'business'} can see significant results. Start with the fundamentals, measure your progress, and keep improving.

*Need help implementing ${topic}? Contact us today for a free consultation.*`

      const words = demoContent.split(/\s+/).length
      setPost({
        title: `The Complete Guide to ${topic} for ${audience || 'Your Business'}`,
        content: demoContent,
        metaDescription: `Learn everything about ${topic}. ${audience ? `Perfect for ${audience}.` : ''} Discover proven strategies, avoid common mistakes, and get actionable tips.`,
        tags: [topic, keyword, audience, 'guide', 'tips'].filter(Boolean).slice(0, 5),
        wordCount: words,
        readingTime: Math.ceil(words / 200),
      })
    }

    setGenerating(false)
  }

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadMarkdown = () => {
    if (!post) return
    const md = `# ${post.title}\n\n**Meta Description:** ${post.metaDescription}\n\n**Tags:** ${post.tags.join(', ')}\n\n---\n\n${post.content}`
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${post.title.toLowerCase().replace(/\s+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Blog Writer</h1>
          <p className="text-sm text-gray-500">Generate SEO-optimized blog posts in seconds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Topic & Audience</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Blog Topic *</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. How to save money on HVAC maintenance"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. homeowners in Austin, TX"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target SEO Keyword</label>
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. HVAC maintenance tips"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Templates */}
          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Blog Template</h2>
            <div className="grid grid-cols-2 gap-2">
              {BLOG_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.label}
                  onClick={() => setSelectedTemplate(selectedTemplate?.label === tmpl.label ? null : tmpl)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all ${selectedTemplate?.label === tmpl.label ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 text-gray-700'}`}
                >
                  <span>{tmpl.icon}</span>
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced options */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
            >
              Advanced Options
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map(t => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${tone === t ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Word Count: ~{wordCount}</label>
                  <input
                    type="range"
                    min={500}
                    max={2000}
                    step={100}
                    value={wordCount}
                    onChange={e => setWordCount(parseInt(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>500</span><span>1000</span><span>1500</span><span>2000</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Custom Instructions (optional)</label>
                  <textarea
                    rows={2}
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="Any specific angle, format, or instructions..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={generate}
            disabled={generating || !topic.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {generating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
            {generating ? 'Generating Blog Post...' : 'Generate Blog Post'}
          </button>
        </div>

        {/* Output panel */}
        <div className="space-y-4">
          {generating && (
            <div className="rounded-xl border bg-white p-8 shadow-sm flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                <Zap className="h-7 w-7 text-purple-600 animate-pulse" />
              </div>
              <p className="font-semibold text-gray-900">Writing your blog post…</p>
              <p className="text-sm text-gray-500">AI is researching, structuring, and crafting SEO-optimized content</p>
              <div className="w-48 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-600 h-1.5 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {post && !generating && (
            <>
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h2 className="text-base font-bold text-gray-900 leading-snug">{post.title}</h2>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyContent(`# ${post.title}\n\n${post.content}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors"
                    >
                      {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadMarkdown}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      .md
                    </button>
                    <button
                      onClick={generate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-xs font-medium text-purple-700 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                  <span>📝 {post.wordCount} words</span>
                  <span>⏱ {post.readingTime} min read</span>
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map(t => <span key={t} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-4">
                  <p className="text-xs font-semibold text-blue-800 mb-0.5">Meta Description (SEO)</p>
                  <p className="text-xs text-blue-700">{post.metaDescription}</p>
                </div>

                <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-50 border p-4">
                  <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                    {post.content}
                  </div>
                </div>
              </div>
            </>
          )}

          {!post && !generating && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Your blog post will appear here</p>
              <p className="text-sm text-gray-400 mt-1">Fill in the topic and click Generate to get started</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-400">
                {['AI-powered content', 'SEO optimized', 'Fully customizable', 'Export to Markdown'].map(f => (
                  <div key={f} className="flex items-center gap-1.5 justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
