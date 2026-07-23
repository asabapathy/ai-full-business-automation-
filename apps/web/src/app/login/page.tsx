'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Eye, EyeOff } from 'lucide-react'
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
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-kanavu-900 via-kanavu-800 to-kanavu-950 p-12 text-white">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
            <Brain className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">Kanavu AI</span>
        </div>
        <div>
          <blockquote className="text-2xl font-medium leading-relaxed mb-4">
            "I told it to get me 20 new customers and it actually did it — in 3 weeks."
          </blockquote>
          <cite className="text-white/60 text-sm">— Sarah M., HVAC Owner</cite>
        </div>
        <div className="text-white/40 text-sm">
          © {new Date().getFullYear()} Kanavu AI. All rights reserved.
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">Kanavu AI</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to your AI business operating system
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
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
                <label className="block text-sm font-medium">Password</label>
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

            <Button type="submit" className="w-full" loading={isLoading}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
