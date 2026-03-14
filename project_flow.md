# NextGen AI Debt Recovery Platform — Project Flow

**Platform:** NextGen AI Debt Recovery Platform
**Domain:** Fintech — Collections & Debt Management
**Reference:** TrueAccord (trueaccord.com)
**SRS Generated:** March 10, 2026

---

## Tech Stack (Mandatory — All Phases)

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) |
| Styling | Tailwind CSS v4 |
| Backend / Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Hosting / Deployment | Vercel |
| Language | TypeScript |
| Auth | Supabase Auth (`@supabase/ssr`) |
| ORM / Query | Supabase JS client (server + browser) |

---

## Development Phases

---

## Phase 1 — Foundation & Authentication ✅ DONE

**Goal:** Scaffold the project, set up infrastructure, implement auth.

### Deliverables
- [x] Next.js app in `web/` with Tailwind CSS + App Router
- [x] Supabase project setup with email/password auth
- [x] Login page (`/login`) with server action
- [x] Signup page (`/signup`) with server action
- [x] Protected dashboard route (`/dashboard`) with logout
- [x] Session middleware for route guarding (`web/src/middleware.ts`)
- [x] Role scaffolding — `roles.ts` (admin, agent, client, debtor)
- [x] Profile table with RLS + auto-create trigger (`profiles` migration)
- [x] Vercel-ready project structure
- [x] Environment variable setup (`.env.local.example`)

### Key Files
```
web/src/app/(auth)/login/
web/src/app/(auth)/signup/
web/src/app/(protected)/dashboard/
web/src/middleware.ts
web/src/lib/auth/roles.ts
web/src/lib/auth/profile.ts
supabase/migrations/20260314120000_profiles.sql
```

### Database
- `profiles` table: id (FK → auth.users), role, created_at, updated_at
- RLS: users can read/update own profile
- Trigger: auto-create profile on user signup with default role `debtor`

---

## Phase 2 — Debtor & Account Management ✅ DONE

**Goal:** Core data layer. Agents and admins can manage debtor profiles and debt accounts.

### Features
- Debtor profile creation, editing, listing (admin + agent)
- Account management (debt accounts linked to debtors)
- Client (creditor) management
- Batch CSV import of debt portfolios
- Role-based dashboard routing (admin → admin dashboard, agent → agent view, client → client portal, debtor → self-service)
- Basic search and filter on debtor list

### Deliverables
- Supabase tables: `debtors`, `accounts`, `clients`
- RLS policies per role
- Admin and Agent dashboards (separate views)
- Client portal (read-only portfolio view)
- Debtor self-service portal (own account view)
- CSV batch import UI (admin/client)
- Vercel deployment with preview URLs per branch

### Database Tables
```
debtors       — id, name, email, phone, address, ssn_last4, created_at
accounts      — id, debtor_id, client_id, original_amount, current_balance,
                status (active/settled/legal/closed), due_date, account_number
clients       — id, name, contact_email, company, created_at
```

---

## Phase 3 — Payment Processing Integration

**Goal:** Enable debtors to make payments and agents to set up payment plans.

### Features
- One-time payment processing (Stripe integration)
- Payment plan creation (installments) with automatic scheduling
- Payment retry logic for failed transactions
- Payment history and receipts
- Automatic account balance updates post-payment
- Settlement offer generation (reduced payoff amounts)
- Payment plan monitoring and adjustment

### Deliverables
- Stripe integration via Supabase Edge Functions or Next.js API routes
- `payments` table and `payment_plans` table
- Debtor payment flow (self-service portal)
- Agent payment plan creation UI
- Settlement negotiation interface (agent side)
- Payment confirmation emails
- Webhook handling for Stripe events

### Database Tables
```
payments       — id, account_id, debtor_id, amount, status, method,
                 stripe_payment_intent_id, created_at
payment_plans  — id, account_id, installment_amount, frequency,
                 next_due_date, total_installments, paid_count, status
settlements    — id, account_id, offer_amount, original_amount,
                 status (pending/accepted/rejected), expires_at
```

---

## Phase 4 — Multi-Channel Communication Engine

**Goal:** Automated and manual outreach across email, SMS, and voice.

### Features
- Email campaign sending (templated, personalized)
- SMS outreach integration
- Campaign creation and scheduling
- A/B testing for message templates
- Automated communication workflows (trigger-based)
- Communication history per debtor account
- Opt-out and preference management (TCPA compliance)
- Call logging for manual calls

### Deliverables
- Email provider integration (SendGrid / Resend)
- SMS integration (Twilio)
- `communications` table for full message history
- `campaigns` table with template management
- `workflows` table (trigger → action definitions)
- Campaign management dashboard (admin/agent)
- Debtor communication preference center
- Unsubscribe/opt-out handling
- Compliance-safe sending windows (no contact outside hours)

### Database Tables
```
communications — id, account_id, debtor_id, channel (email/sms/voice),
                 direction (outbound/inbound), status, subject,
                 body, sent_at, opened_at
campaigns      — id, name, template_id, target_segment, status,
                 scheduled_at, sent_count, open_rate
workflows      — id, name, trigger_type, trigger_config, actions_json,
                 is_active, created_at
```

---

## Phase 5 — Compliance Management & Dispute Resolution

**Goal:** Built-in compliance enforcement and structured dispute handling.

### Features
- FDCPA, TCPA, and state regulation rule engine
- Automated compliance scoring per communication
- Dispute submission (debtor side)
- Dispute workflow management (agent side)
- Legal action tracking (accounts moving to legal proceedings)
- Document management (legal docs, agreements, receipts)
- Audit trail for all system actions
- Bankruptcy monitoring and account status updates

### Deliverables
- `compliance_rules` table (configurable per jurisdiction)
- `disputes` table with status workflow
- `documents` table (linked to Supabase Storage)
- `audit_logs` table (immutable append-only)
- `legal_actions` table
- `bankruptcy_records` table
- Compliance violation alerts
- Dispute management UI (agent + debtor views)
- Document upload / download interface
- Audit log viewer (admin only)

### Database Tables
```
compliance_rules  — id, rule_type, jurisdiction, rule_config, is_active
disputes          — id, account_id, debtor_id, reason, status
                    (open/under_review/resolved), resolution_notes
documents         — id, account_id, type, storage_path, uploaded_by, created_at
audit_logs        — id, actor_id, action, entity_type, entity_id,
                    metadata_json, created_at
legal_actions     — id, account_id, action_type, filed_at, status
bankruptcy_records— id, debtor_id, case_number, filed_date, status
```

---

## Phase 6 — Analytics & Reporting

**Goal:** Real-time dashboards and scheduled reports for all roles.

### Features
- Admin: platform-wide collection rates, revenue, compliance incidents
- Agent: personal performance metrics, campaign results
- Client: portfolio health, recovery rates, payment tracking
- Scheduled report generation (PDF/CSV exports)
- Real-time metrics (Supabase Realtime or polling)
- Campaign effectiveness tracking with A/B test results
- Key metrics: collection rate %, time to first payment, dispute resolution time

### Deliverables
- `analytics_events` table for event tracking
- Analytics dashboards per role (using Recharts or similar)
- Report scheduling configuration
- PDF/CSV export for client and compliance reports
- Real-time collection counters on dashboards

### Database Tables
```
analytics_events — id, event_type, actor_id, account_id,
                   metadata_json, created_at
reports          — id, report_type, generated_by, file_path,
                   schedule_config, last_run_at
```

---

## Phase 7 — AI & Machine Learning Features

**Goal:** Intelligent automation and predictive capabilities.

### Features
- AI Propensity Scoring — predict payment likelihood per debtor
- Natural Language Processing — analyze debtor communications for sentiment
- Predictive Contact Optimization — optimal contact time, channel, frequency per debtor
- Behavioral Analytics — identify patterns to optimize engagement timing
- Dynamic Pricing Engine — AI-optimized settlement offer generation
- Real-time Risk Assessment — continuous risk evaluation per account
- Automated Compliance Scoring — AI monitoring of communications for violations
- Intelligent Workflow Optimization — self-improving collection workflows

### Deliverables
- Claude API / OpenAI integration for NLP features
- Scoring model pipeline (can use Supabase Edge Functions + Python service)
- Propensity score stored per debtor account
- Sentiment analysis on inbound messages
- AI-recommended contact schedules
- Dynamic settlement offer calculator
- Compliance violation detection on outbound messages

### Notes
- AI models may run as separate microservices called via API from Next.js
- Scores and recommendations stored back to Supabase for display
- All AI actions logged to `audit_logs` for compliance traceability

---

## Phase 8 — Advanced & Differentiating Features

**Goal:** Market-differentiating capabilities and integrations.

### Features
- Skip Tracing Integration — third-party contact data enrichment
- Credit Bureau Reporting — automated credit bureau updates
- Call Center Integration — softphone with auto call logging
- API Management Console — RESTful APIs for third-party integrations (rate limiting, monitoring)
- Multi-language Support — localized UI and communications
- Chatbot Integration — 24/7 AI chatbot for debtor self-service
- Mobile-Responsive Debtor Portal — fully optimized mobile experience
- Batch File Processing — large portfolio import/export with validation
- Role-Based Access Control — granular permissions beyond the 4 base roles

### Future / Innovative (Post-MVP)
- Blockchain Payment Verification — immutable payment history via distributed ledger
- Voice Analytics — real-time call emotion detection and compliance monitoring
- Gamified debt repayment — rewards and milestone tracking
- Cryptocurrency payment acceptance
- AR/VR debt counseling sessions
- Predictive life event modeling
- Open banking API integration for real-time financial capacity assessment

---

## Phase Summary

| Phase | Focus | Status |
|---|---|---|
| 1 | Foundation + Auth (Next.js, Supabase, Vercel) | ✅ Done |
| 2 | Debtor & Account Management | ✅ Done |
| 3 | Payment Processing | Upcoming |
| 4 | Multi-Channel Communications + Campaigns | Upcoming |
| 5 | Compliance + Disputes + Audit | Upcoming |
| 6 | Analytics & Reporting | Upcoming |
| 7 | AI / ML Features | Upcoming |
| 8 | Advanced Integrations + Differentiators | Upcoming |

---

## Deployment Strategy (Vercel)

- **Branch:** `main` → Production deployment on Vercel
- **Branch:** `dev` → Preview deployment (staging)
- **Feature branches** → Automatic preview URLs per PR
- **Environment variables** managed in Vercel dashboard per environment
- **Database:** Supabase project per environment (dev / production)
- **Migrations:** Run via Supabase CLI (`supabase db push`) before each deployment

---

## Key Metrics to Track (From SRS)

- Collection rate percentage
- Time to first payment
- Customer satisfaction scores
- Compliance violation incidents
- Cost per dollar collected
- Payment plan completion rates
- Dispute resolution time
- Client retention rate
- Average settlement percentage
- Monthly recurring revenue
- Platform uptime and reliability
