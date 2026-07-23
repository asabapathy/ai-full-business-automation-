# Kanavu AI — AI Business Operating System

> An AI-powered Business Operating System for small and medium-sized businesses. One platform that runs your business with minimal human intervention.

[![CI/CD](https://github.com/asabapathy/ai-full-business-automation-/actions/workflows/ci.yml/badge.svg)](https://github.com/asabapathy/ai-full-business-automation-/actions)

---

## Vision

A business owner should simply type:
- *"Get me 20 new customers this month."*
- *"Increase my revenue by 15%."*
- *"Answer all customer calls."*

The AI determines the required tasks, creates a plan, executes it automatically, monitors results, and continuously optimizes — without the owner needing to understand marketing, CRM, or automation.

---

## Architecture Overview

```
kanavu-ai/
├── apps/
│   ├── web/              # Next.js 15 frontend (React 19, Tailwind CSS)
│   ├── api/              # Node.js/Express backend (TypeScript)
│   └── workers/          # BullMQ background job workers
├── packages/
│   ├── database/         # Prisma ORM schema + migrations
│   ├── types/            # Shared TypeScript types
│   ├── ai-core/          # AI providers, agents, memory system
│   ├── ui/               # Shared UI component library
│   └── config/           # Shared configuration
├── infrastructure/
│   ├── docker/           # Dockerfiles + init scripts
│   ├── kubernetes/       # K8s manifests (base + overlays)
│   └── terraform/        # IaC for cloud resources
├── .github/
│   └── workflows/        # CI/CD pipelines
└── docs/                 # Additional documentation
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| ORM | Prisma |
| AI (Primary) | Claude (Anthropic) |
| AI (Fallback) | GPT-4o (OpenAI) |
| Vector Search | pgvector (embedded in PostgreSQL) |
| Queue | BullMQ + Redis |
| Storage | S3-compatible (MinIO for local dev) |
| Auth | JWT + Refresh Tokens |
| Payments | Stripe |
| Voice AI | Twilio + ElevenLabs |
| Email | Resend / SMTP |
| SMS | Twilio |
| Monitoring | Pino (structured logging), Sentry |
| Containerization | Docker + Docker Compose |
| Orchestration | Kubernetes |
| CI/CD | GitHub Actions |

---

## AI Modules

| Module | Status | Description |
|---|---|---|
| Business Brain | ✅ | Central AI advisor — plans, delegates, executes |
| AI Memory | ✅ | Long-term episodic + semantic memory with pgvector |
| AI Receptionist | 🚧 | Voice AI, call answering, appointment booking |
| AI Marketing | 🚧 | Social media, email, SMS campaign automation |
| AI CRM | ✅ | Lead scoring, contact management, deal pipeline |
| AI Sales | 🚧 | Quote generation, follow-up automation |
| AI Finance | 🚧 | Invoice automation, cash flow forecasting |
| AI Website Builder | 🚧 | Auto website generation and SEO optimization |
| AI Business Doctor | 🚧 | 24/7 health monitoring, proactive alerts |
| AI Operations | 🚧 | Scheduling, inventory, employee management |
| Competitor Intel | 🚧 | Competitor tracking and strategic insights |
| AI Analytics | 🚧 | Real-time dashboards with predictive forecasting |
| Automation Builder | 🚧 | Visual + natural language workflow builder |

---

## Quick Start

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- npm 10+

### 1. Clone & Install
```bash
git clone <repo>
cd kanavu-ai
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your API keys
```

Required for core functionality:
- `ANTHROPIC_API_KEY` — Claude API (or `OPENAI_API_KEY`)
- `JWT_SECRET` — 32+ character secret
- `JWT_REFRESH_SECRET` — 32+ character secret

### 3. Start Infrastructure
```bash
docker-compose up -d postgres redis minio
```

### 4. Database Setup
```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:seed        # Seed demo data
```

### 5. Start Development
```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Docs: http://localhost:4000/api/v1/health

### Demo Credentials
```
Email: admin@kanavu.ai
Password: Password123!
```

---

## API Reference

### Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### AI Brain

```http
POST /api/v1/ai/chat                    # Chat with Business Brain
POST /api/v1/ai/chat (stream: true)     # Streaming response
POST /api/v1/ai/goal                    # Submit business goal
GET  /api/v1/ai/conversations           # List conversations
GET  /api/v1/ai/conversations/:id/messages
GET  /api/v1/ai/tasks                   # AI task queue
GET  /api/v1/ai/memory/search?q=...     # Search memory
POST /api/v1/ai/knowledge               # Store knowledge
GET  /api/v1/ai/knowledge               # List knowledge base
```

### CRM

```http
GET    /api/v1/crm/contacts
POST   /api/v1/crm/contacts
GET    /api/v1/crm/contacts/:id
PATCH  /api/v1/crm/contacts/:id
DELETE /api/v1/crm/contacts/:id

GET    /api/v1/crm/deals
POST   /api/v1/crm/deals
PATCH  /api/v1/crm/deals/:id

GET    /api/v1/crm/companies
POST   /api/v1/crm/companies

POST   /api/v1/crm/activities
GET    /api/v1/crm/activities
```

### Organization

```http
GET    /api/v1/org
PATCH  /api/v1/org
GET    /api/v1/org/members
PATCH  /api/v1/org/members/:userId/role
DELETE /api/v1/org/members/:userId
GET    /api/v1/org/analytics/overview
```

---

## Database Schema

The schema supports 25+ tables covering:
- **Multi-tenancy**: Organizations, users, memberships, feature flags
- **AI Brain**: Memories (with vector embeddings), knowledge base, conversations, messages, tasks, decisions
- **CRM**: Contacts, companies, deals, quotes, activities
- **Marketing**: Campaigns, executions, social accounts, social posts
- **Finance**: Invoices, payments, expenses
- **Operations**: Employees, schedules, inventory, vendors, services, appointments
- **Automation**: Workflows, steps, executions
- **Website**: Websites, pages, blog posts
- **Reputation**: Reviews, competitor snapshots
- **Security**: API keys, webhooks, audit logs

---

## Product Roadmap

### Phase 1 — Foundation ✅ (Current)
- [x] Monorepo architecture
- [x] Database schema (complete)
- [x] Authentication (JWT + refresh)
- [x] AI provider abstraction (Anthropic + OpenAI)
- [x] Business Brain agent
- [x] Memory system (episodic + semantic)
- [x] CRM (contacts, deals, companies)
- [x] Frontend foundation (Next.js + Tailwind)
- [x] Docker + CI/CD pipeline
- [x] Kubernetes manifests

### Phase 2 — Core AI Modules (Next)
- [ ] AI Marketing Engine (social posting, email campaigns)
- [ ] AI Sales Assistant (automated follow-ups, quotes)
- [ ] AI Finance (invoice automation, payment tracking)
- [ ] Appointment scheduling system
- [ ] Review management

### Phase 3 — Voice & Website
- [ ] AI Receptionist (Twilio + ElevenLabs)
- [ ] AI Website Builder (auto-generate + SEO)
- [ ] AI Blog Writer
- [ ] Google Ads integration

### Phase 4 — Intelligence Layer
- [ ] Business Doctor (health monitoring)
- [ ] Competitor Intelligence (web scraping + analysis)
- [ ] Predictive Analytics (forecasting)
- [ ] A/B testing engine
- [ ] AI Automation Builder (visual + NL)

### Phase 5 — Scale & Polish
- [ ] Industry templates (20+ verticals)
- [ ] White-label support
- [ ] Mobile app (React Native)
- [ ] Partner marketplace
- [ ] API access for enterprise

---

## Industry Templates

Pre-configured for:
- HVAC, Plumbing, Electrical, Roofing, Landscaping
- Dental clinics, Medical practices, Veterinary clinics
- Restaurants, Salons, Gyms
- Law firms, Insurance agencies, Accounting firms
- Auto repair, Cleaning companies, Daycare centers
- Autism therapy (ABA providers)
- Real estate agents, Contractors

Each template includes pre-built workflows, KPI dashboards, marketing campaigns, appointment types, and AI knowledge base content.

---

## Security

- JWT authentication with short-lived access tokens (15m)
- Refresh token rotation with Redis blacklisting
- Row-level multi-tenancy (organizationId on every table)
- Rate limiting per IP and per organization
- Helmet.js security headers
- Bcrypt password hashing (12 rounds)
- Audit logging for all sensitive operations
- API key management with SHA-256 hashing
- Webhook signature verification

---

## Deployment

### Docker Compose (Development)
```bash
docker-compose up -d
```

### Kubernetes (Production)
```bash
kubectl apply -k infrastructure/kubernetes/overlays/production/
```

### Environment Variables
See `.env.example` for all required variables.

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

Proprietary — All rights reserved. Contact for licensing.
