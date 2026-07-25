'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Eye, EyeOff, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useAuthStore } from '../../stores/auth.store'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #060a12 0%, #0d1526 50%, #092030 100%)' }}
      >
        {/* Glow orbs */}
        <div className="pointer-events-none absolute top-1/3 left-1/4 h-64 w-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-40 w-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)', filter: 'blur(30px)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.4)' }}
          >
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Kanavu AI</span>
        </div>

        {/* Quote */}
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Customer story</span>
          </div>
          <blockquote className="text-2xl font-medium leading-relaxed text-white/90">
            &ldquo;I told it to get me 20 new customers and it actually did it — in 3 weeks.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
            >
              SM
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">Sarah M.</p>
              <p className="text-xs text-white/40">HVAC Owner</p>
            </div>
          </div>
        </div>

        <div className="relative text-white/30 text-xs">
          © {new Date().getFullYear()} Kanavu AI. All rights reserved.
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <div className="kv-anim mx-auto w-full max-w-sm" style={{ animationDelay: '0.1s' }}>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 14px rgba(6,182,212,0.35)' }}
            >
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Kanavu AI</span>
          </div>

          <h1 className="text-2xl font-bold mb-1 text-foreground">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to your AI business operating system
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Email</label>
              <Input
                type="email"
                placeholder="you@business.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
