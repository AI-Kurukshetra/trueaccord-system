# NextGen AI Debt Recovery Platform — Agents & Roles

**Platform:** NextGen AI Debt Recovery Platform
**Domain:** Fintech — Collections & Debt Management
**Tech Stack:** Next.js · Supabase · Vercel

---

## Overview

The platform operates with four distinct user roles. Each role has a defined scope of access, responsibilities, and interaction with the system. Role assignment is managed via the `profiles` table in Supabase with Row-Level Security enforced per role.

---

## Role Definitions

### 1. Admin

**Supabase role value:** `admin`

**Description:**
Full platform access. Responsible for system configuration, user management, compliance oversight, and platform-wide reporting.

**Responsibilities:**
- Manage all user accounts (agents, clients, debtors)
- Configure compliance rules (FDCPA, TCPA, state regulations)
- Set up and monitor campaigns and workflows
- Access all analytics and audit trails
- Manage API integrations and batch file processing
- Assign and revoke roles
- View all debtor portfolios across all clients

**Access:**
- All routes and data
- Admin dashboard with system-wide analytics
- Audit log viewer
- User management panel
- Compliance configuration
- API management console

---

### 2. Agent (Collection Agent)

**Supabase role value:** `agent`

**Description:**
Day-to-day collection operations. Manages assigned debtor accounts, executes outreach, handles disputes, and negotiates settlements.

**Responsibilities:**
- Work assigned debtor accounts
- Send and track communications (email, SMS, voice)
- Negotiate payment plans and settlement offers
- Handle dispute resolution workflows
- Document all interactions for compliance
- Use campaign management tools for outreach
- Monitor payment plan adherence
- Flag accounts for legal action when needed

**Access:**
- Assigned debtor account details
- Communication tools (email, SMS, call logging)
- Payment plan creation and management
- Dispute management interface
- Settlement negotiation tools
- Campaign performance for own accounts
- Document upload and management

---

### 3. Client (Creditor)

**Supabase role value:** `client`

**Description:**
Creditors who have placed debt portfolios on the platform. Monitors collection performance, views portfolio health, and accesses reports.

**Responsibilities:**
- Monitor portfolio recovery rates
- View debtor account statuses (read-only)
- Access scheduled and on-demand reports
- Review compliance incident reports
- Configure white-label portal settings
- Manage batch file uploads for debt portfolios
- Track campaign performance against their accounts

**Access:**
- Client portal (white-label capable)
- Portfolio-level analytics dashboard
- Scheduled reports (collection rates, payment status)
- Batch file import/export for their accounts
- Read-only debtor account list for their portfolio
- Compliance summary reports

---

### 4. Debtor (Consumer)

**Supabase role value:** `debtor`

**Description:**
The consumer who owes the debt. Interacts with the platform via a self-service portal to view their account, make payments, set up payment plans, and communicate with agents.

**Responsibilities:**
- View outstanding balances and account history
- Make one-time payments or set up payment plans
- Communicate with assigned agent
- Submit disputes
- Access and download documents (payment agreements, receipts)
- Update contact preferences

**Access:**
- Self-service debtor portal only
- Own account details (balance, history, status)
- Payment interface (one-time and installment)
- Dispute submission form
- Document download (own records only)
- Communication preferences
- Settlement offer review and acceptance

---

## Role Comparison Matrix

| Capability | Admin | Agent | Client | Debtor |
|---|:---:|:---:|:---:|:---:|
| Manage users | Yes | No | No | No |
| View all accounts | Yes | Assigned only | Own portfolio | Own only |
| Send communications | Yes | Yes | No | No |
| Make payments | No | No | No | Yes |
| Create payment plans | Yes | Yes | No | Yes (accept) |
| Submit disputes | No | No | No | Yes |
| Resolve disputes | Yes | Yes | No | No |
| View analytics | Full | Own | Portfolio | No |
| Configure compliance | Yes | No | No | No |
| Upload batch files | Yes | No | Yes | No |
| API access | Yes | No | Limited | No |
| Access audit logs | Yes | No | No | No |

---

## Default Role on Signup

All public signups default to the `debtor` role. This is enforced via the `handle_new_user()` database trigger in Supabase. Elevated roles (`admin`, `agent`, `client`) must be assigned manually by an Admin through the user management panel.

---

## Role Assignment Flow

```
Public signup → debtor (automatic via DB trigger)
Admin panel  → admin assigns agent / client roles
Invite flow  → (Phase 3+) email invite with pre-assigned role
```

---

## Authentication

- Provider: Supabase Auth (email/password — Phase 1)
- Session: Server-side via `@supabase/ssr` cookie management
- Route protection: Next.js middleware (`web/src/middleware.ts`)
- Role lookup: `profiles` table with RLS policies
- Future: OAuth providers, MFA for admin/agent roles (Phase 2+)
