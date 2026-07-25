import Link from 'next/link'
import { Brain, Zap, TrendingUp, Phone, Globe, Star, ArrowRight, CheckCircle2, Sparkles, BarChart3, Users } from 'lucide-react'

const features = [
  { icon: Brain, title: 'AI Business Brain', desc: 'Central intelligence that learns your business and makes smart, automated decisions around the clock.' },
  { icon: Phone, title: 'AI Receptionist', desc: 'Answers calls, books appointments, and handles customers 24/7 in any language. Never misses a lead.' },
  { icon: TrendingUp, title: 'AI Marketing Engine', desc: 'Runs Facebook, Instagram, Google Ads, email, and SMS campaigns — fully automated with real-time optimization.' },
  { icon: Globe, title: 'AI Website Builder', desc: 'Builds and updates your site, writes blog posts, and improves SEO continuously without you touching a thing.' },
  { icon: Zap, title: 'AI Automation Builder', desc: 'Create workflows with plain English. No coding required. Set it once, run forever.' },
  { icon: Star, title: 'AI Business Doctor', desc: 'Monitors your business health 24/7, catches problems early, and takes corrective action before they cost you.' },
]

const testimonials = [
  { quote: 'I told it to get me 20 new customers and it actually did it. In 3 weeks.', author: 'Sarah M.', role: 'HVAC Owner', initials: 'SM' },
  { quote: 'It answers my phones better than my receptionist did. My customers love it.', author: 'Dr. James L.', role: 'Dental Clinic', initials: 'JL' },
  { quote: 'Revenue up 23% in 60 days. The AI found opportunities I didn\'t know existed.', author: 'Maria C.', role: 'Salon Owner', initials: 'MC' },
]

const steps = [
  { step: '01', title: 'Describe your goal', desc: 'Type what you want in plain English. "Get me 10 new customers" or "Follow up with all open leads."' },
  { step: '02', title: 'AI builds the plan', desc: 'Your AI Business Brain creates a complete strategy and assigns tasks to the right AI agents.' },
  { step: '03', title: 'It executes & reports', desc: 'Agents execute every step automatically while you watch the results roll in on your dashboard.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(9,15,28,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(28,56,96,0.4)' }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 16px rgba(6,182,212,0.35)' }}
            >
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Kanavu</span>
            <span className="font-bold text-primary">AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
            <Link href="#testimonials" className="hover:text-foreground transition-colors">Customers</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/register">
              <button
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 16px rgba(6,182,212,0.3)' }}
              >
                Start Free Trial
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-24 pb-16 sm:pt-36 sm:pb-24">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.12) 0%, transparent 65%)' }} />

        <div className="mx-auto max-w-4xl text-center relative">
          <div
            className="kv-anim inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-primary mb-8"
            style={{ background: 'rgba(6,182,212,0.08)', borderColor: 'rgba(6,182,212,0.25)', animationDelay: '0.05s' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Business Operating System
          </div>

          <h1 className="kv-anim text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6 leading-tight" style={{ animationDelay: '0.12s' }}>
            Your Business,{' '}
            <span style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Run by AI
            </span>
          </h1>

          <p className="kv-anim text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10" style={{ animationDelay: '0.19s' }}>
            Just say what you want. <em className="text-foreground/80 not-italic font-medium">&ldquo;Get me 20 new customers.&rdquo;</em> The AI creates the plan,
            executes every task, and reports back — while you focus on what matters.
          </p>

          <div className="kv-anim flex flex-col sm:flex-row gap-4 justify-center mb-10" style={{ animationDelay: '0.26s' }}>
            <Link href="/register">
              <button
                className="flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white w-full sm:w-auto transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 32px rgba(6,182,212,0.4)' }}
              >
                Start Free — No Card Required
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/login">
              <button
                className="flex items-center justify-center gap-2 rounded-xl border px-8 py-3.5 text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent w-full sm:w-auto transition-all"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                Sign in
              </button>
            </Link>
          </div>

          <div className="kv-anim flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground" style={{ animationDelay: '0.33s' }}>
            {['14-day free trial', 'No credit card', 'Cancel anytime', '24/7 AI support'].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Chat Demo */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-2xl">
          <div
            className="kv-anim rounded-2xl overflow-hidden"
            style={{
              animationDelay: '0.4s',
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400/60" />
                <div className="h-3 w-3 rounded-full bg-amber-400/60" />
                <div className="h-3 w-3 rounded-full bg-emerald-400/60" />
              </div>
              <span className="text-xs text-muted-foreground mx-auto">Kanavu AI — Business Brain</span>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">You</div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[80%]" style={{ background: 'hsl(var(--muted))' }}>
                  Get me 20 new customers this month
                </div>
              </div>
              <div className="flex gap-3 flex-row-reverse">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 12px rgba(6,182,212,0.3)' }}
                >
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div
                  className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] text-white"
                  style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(14,165,233,0.15))', border: '1px solid rgba(6,182,212,0.25)' }}
                >
                  <p className="font-medium mb-2.5 text-foreground">Got it. Here&apos;s my plan for 20 new customers:</p>
                  <p className="mb-1.5 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <span className="text-foreground/80">Launching Google Ads targeting local buyers</span></p>
                  <p className="mb-1.5 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <span className="text-foreground/80">Publishing 3 SEO blog posts this week</span></p>
                  <p className="mb-1.5 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <span className="text-foreground/80">Setting up automated lead follow-up sequences</span></p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <span className="text-foreground/80">Sending referral campaign to 47 existing customers</span></p>
                  <p className="mt-3 text-xs text-primary/80">Starting now. I&apos;ll report progress daily.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y px-4 py-8" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted)/0.3)' }}>
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
          {[
            { value: '2,400+', label: 'businesses growing with AI' },
            { value: '$48M+', label: 'in revenue generated' },
            { value: '4.9/5', label: 'average rating' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-foreground tabular">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Everything in one place</p>
            <h2 className="text-3xl font-bold sm:text-4xl mb-4 text-foreground">One AI platform. Infinite leverage.</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Replaces your CRM, marketing tools, receptionist, and more — working together as one intelligent system.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="kv-anim rounded-xl border p-6 hover:border-primary/30 transition-all duration-300 group"
                style={{
                  animationDelay: `${0.05 + i * 0.08}s`,
                  background: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(6,182,212,0.12)', boxShadow: '0 0 0 1px rgba(6,182,212,0.15)' }}
                >
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 py-24 border-y" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted)/0.2)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Simple by design</p>
            <h2 className="text-3xl font-bold sm:text-4xl text-foreground">From goal to results in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.step} className="kv-anim relative" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                <div className="text-5xl font-black text-primary/10 mb-4 tabular">{step.step}</div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-4 text-muted-foreground/20">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Real results</p>
            <h2 className="text-3xl font-bold sm:text-4xl text-foreground">Businesses growing with Kanavu AI</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={t.author}
                className="kv-anim rounded-xl border p-6"
                style={{
                  animationDelay: `${0.1 + i * 0.08}s`,
                  background: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{t.author}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(14,165,233,0.08) 100%)', borderTop: '1px solid rgba(6,182,212,0.2)' }}>
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />
        <div className="mx-auto max-w-3xl text-center relative">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4 text-foreground">Ready to let AI run your business?</h2>
          <p className="text-muted-foreground text-lg mb-10">
            Join 2,400+ businesses using Kanavu AI to grow faster with less effort.
          </p>
          <Link href="/register">
            <button
              className="inline-flex items-center gap-2 rounded-xl px-10 py-4 text-lg font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 40px rgba(6,182,212,0.45)' }}
            >
              Start Your Free Trial
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">14-day free trial · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
            >
              <Brain className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-foreground">Kanavu AI</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
