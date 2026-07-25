'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '../../components/ui/input'
import { useAuthStore } from '../../stores/auth.store'

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(2, 'Business name must be at least 2 characters').max(100),
})

type RegisterForm = z.infer<typeof registerSchema>

const benefits = [
  '14-day free trial, no credit card required',
  'AI starts working the moment you sign up',
  'Cancel anytime, no contracts',
  '24/7 AI support included',
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data)
      router.push('/dashboard')
      toast.success('Welcome to Kanavu AI! Your AI is getting to work.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
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
        <div className="pointer-events-none absolute top-1/4 right-1/4 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="pointer-events-none absolute bottom-1/3 left-1/4 h-40 w-40 rounded-full opacity-10"
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

        {/* Benefits */}
        <div className="relative space-y-6">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">What you get</p>
            <h2 className="text-3xl font-bold leading-tight text-white">
              Start your 14-day free trial
            </h2>
          </div>
          <div className="space-y-3.5">
            {benefits.map(benefit => (
              <div key={benefit} className="flex items-center gap-3">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                <span className="text-sm text-white/75">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-white/30 text-xs">
          © {new Date().getFullYear()} Kanavu AI. All rights reserved.
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 overflow-y-auto">
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

          <h1 className="text-2xl font-bold mb-1 text-foreground">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Set up your AI business operating system in minutes
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">First name</label>
                <Input placeholder="John" {...register('firstName')} />
                {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Last name</label>
                <Input placeholder="Smith" {...register('lastName')} />
                {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Business name</label>
              <Input placeholder="Smith's HVAC" {...register('organizationName')} />
              {errors.organizationName && <p className="mt-1 text-xs text-destructive">{errors.organizationName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Work email</label>
              <Input type="email" placeholder="john@smithshvac.com" autoComplete="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
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
              ) : 'Start Free Trial'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing up you agree to our{' '}
            <Link href="/terms" className="underline hover:text-foreground">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
