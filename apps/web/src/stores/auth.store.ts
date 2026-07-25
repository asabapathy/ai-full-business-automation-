'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@kanavu/types'
import { api } from '../lib/api-client'

interface OrgState {
  id: string
  name: string
  slug: string
  plan: string
  industry: string | null
  trialEndsAt: string | null
  subscriptionStatus: string | null
}

interface AuthState {
  user: AuthUser | null
  organization: OrgState | null
  isAuthenticated: boolean
  isLoading: boolean
  isImpersonating: boolean
  impersonatingOrg: { name: string; id: string } | null

  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    organizationName: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  impersonate: (tokens: { accessToken: string; refreshToken: string }, org: { id: string; name: string; slug: string }) => void
  exitImpersonation: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      isImpersonating: false,
      impersonatingOrg: null,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const result = await api.post<{
            user: AuthUser
            tokens: { accessToken: string; refreshToken: string }
            organization: { id: string; name: string; slug: string; plan?: string; industry?: string | null }
          }>('/auth/login', { email, password })

          api.setTokens(result.tokens.accessToken, result.tokens.refreshToken)
          set({
            user: result.user,
            organization: {
              ...result.organization,
              plan: result.organization.plan ?? 'STARTER',
              industry: result.organization.industry ?? null,
              trialEndsAt: null,
              subscriptionStatus: null,
            },
            isAuthenticated: true,
            isImpersonating: false,
            impersonatingOrg: null,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async data => {
        set({ isLoading: true })
        try {
          const result = await api.post<{
            user: AuthUser
            tokens: { accessToken: string; refreshToken: string }
          }>('/auth/register', data)

          api.setTokens(result.tokens.accessToken, result.tokens.refreshToken)
          set({ user: result.user, isAuthenticated: true })
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        api.clearTokens()
        set({ user: null, organization: null, isAuthenticated: false, isImpersonating: false, impersonatingOrg: null })
      },

      refreshUser: async () => {
        try {
          const [meResult, orgResult] = await Promise.all([
            api.get<{ user: AuthUser }>('/auth/me'),
            api.get<{ organization: { id: string; name: string; slug: string; subscription?: { plan?: string; status?: string; trialEndsAt?: string | null }; industry?: string | null } }>('/org').catch(() => ({ organization: null })),
          ])
          const org = orgResult.organization
          const sub = (org as any)?.subscription
          set({
            user: meResult.user,
            organization: org ? {
              id: org.id,
              name: org.name,
              slug: org.slug,
              plan: sub?.plan ?? get().organization?.plan ?? 'STARTER',
              industry: (org as any).industry ?? get().organization?.industry ?? null,
              trialEndsAt: sub?.trialEndsAt ?? get().organization?.trialEndsAt ?? null,
              subscriptionStatus: sub?.status ?? get().organization?.subscriptionStatus ?? null,
            } : get().organization,
          })
        } catch {
          get().logout()
        }
      },

      impersonate: (tokens, org) => {
        api.setTokens(tokens.accessToken, tokens.refreshToken)
        set({
          isImpersonating: true,
          impersonatingOrg: { id: org.id, name: org.name },
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            plan: 'BUSINESS',
            industry: null,
            trialEndsAt: null,
            subscriptionStatus: 'ACTIVE',
          },
        })
      },

      exitImpersonation: () => {
        api.clearTokens()
        set({ user: null, organization: null, isAuthenticated: false, isImpersonating: false, impersonatingOrg: null })
      },
    }),
    {
      name: 'kanavu-auth',
      partialize: state => ({ user: state.user, organization: state.organization, isAuthenticated: state.isAuthenticated, isImpersonating: state.isImpersonating, impersonatingOrg: state.impersonatingOrg }),
    },
  ),
)
