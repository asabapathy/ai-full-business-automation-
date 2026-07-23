import Link from 'next/link'
import { Brain, Zap, TrendingUp, Phone, Globe, Star, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

const features = [
  { icon: Brain, title: 'AI Business Brain', desc: 'Central intelligence that learns your business and makes smart decisions automatically.' },
  { icon: Phone, title: 'AI Receptionist', desc: 'Answers calls, books appointments, and handles customers 24/7 in multiple languages.' },
  { icon: TrendingUp, title: 'AI Marketing Engine', desc: 'Manages Facebook, Instagram, Google Ads, email, and SMS campaigns automatically.' },
  { icon: Globe, title: 'AI Website Builder', desc: 'Builds and updates your website, writes blog posts, and optimizes SEO continuously.' },
  { icon: Zap, title: 'AI Automation Builder', desc: 'Create workflows with plain English. No coding required.' },
  { icon: Star, title: 'AI Business Doctor', desc: 'Monitors your business 24/7 and fixes problems before they become crises.' },
]

const testimonials = [
  { quote: 'I told it to get me 20 new customers and it actually did it. In 3 weeks.', author: 'Sarah M.', role: 'HVAC Owner' },
  { quote: 'It answers my phones better than my receptionist did. Customers love it.', author: 'Dr. James L.', role: 'Dental Clinic' },
  { quote: 'Revenue up 23% in 60 days. The AI found opportunities I had no idea existed.', author: 'Maria C.', role: 'Salon Owner' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">Kanavu AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#industries" className="hover:text-foreground transition-colors">Industries</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div className="gradient-mesh absolute inset-0 pointer-events-none" />
        <div className="mx-auto max-w-4xl text-center relative">
          <Badge variant="ai" className="mb-6 text-sm px-4 py-1.5">
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            AI Business Operating System
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6">
            Your Business,{' '}
            <span className="bg-gradient-to-r from-kanavu-500 to-kanavu-700 bg-clip-text text-transparent">
              Run by AI
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Just say what you want. <em>"Get me 20 new customers."</em> The AI creates the plan,
            executes every task, and reports back — while you focus on what matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="xl" variant="ai" className="w-full sm:w-auto">
                Start Free — No Card Required
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="xl" variant="outline" className="w-full sm:w-auto">
                See a Demo
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['14-day free trial', 'No credit card', 'Cancel anytime', '24/7 AI support'].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Chat Demo */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border bg-card shadow-xl overflow-hidden">
            <div className="border-b bg-muted/50 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-muted-foreground mx-auto">Kanavu AI — Business Brain</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">You</div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm max-w-[80%]">
                  Get me 20 new customers this month
                </div>
              </div>
              <div className="flex gap-3 flex-row-reverse">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-kanavu-500 to-kanavu-600 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm max-w-[80%]">
                  <p className="mb-2">Got it. Here's my plan for 20 new customers this month:</p>
                  <p className="mb-1">✅ Launching Google Ads campaign targeting local buyers</p>
                  <p className="mb-1">✅ Publishing 3 SEO blog posts this week</p>
                  <p className="mb-1">✅ Setting up automated follow-up sequences</p>
                  <p className="mb-1">✅ Sending referral campaign to your 47 existing customers</p>
                  <p className="mt-2 text-primary-foreground/80 text-xs">Starting now. I'll report progress daily.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">Everything your business needs</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              One AI platform that replaces a dozen tools. No integrations to manage.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => (
              <div key={feature.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-center mb-12">Businesses are growing with Kanavu AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.author} className="rounded-xl border bg-card p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm mb-4 italic">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to let AI run your business?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Join thousands of businesses using Kanavu AI to grow faster with less effort.
          </p>
          <Link href="/register">
            <Button size="xl" variant="secondary" className="text-foreground">
              Start Your Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="font-semibold text-foreground">Kanavu AI</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
