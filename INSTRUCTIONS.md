# MyERP — Developer Instructions & Setup Guide

> Full-stack SaaS ERP for Greek businesses. Multi-tenant, role-based, bilingual (Greek/English).

---

## 📁 Project Location

```
/Users/mac/Documents/GitHub/MyERP
```

---

## ⚡ Quick Start (Local Development)

```bash
# 1. Clone
git clone https://github.com/EliasBolo/MyERP.git
cd MyERP

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Fill in the required values (see .env section below)

# 4. Apply schema to SQLite (dev only)
npm run db:push

# 5. Seed demo data
npm run db:seed

# 6. Start dev server
npm run dev
```

Open: **http://localhost:3000**

---

## 🔐 Login Credentials (after seed)

All roles use the **same login URL**: `http://localhost:3000/login`

| Role | Email | Password | Redirects To |
|---|---|---|---|
| **Master Admin** | `admin@myerp.gr` | `Admin@123456` | `/admin` |
| **Business Admin** | `bizadmin@demo.gr` | `Admin@123456` | `/dashboard` |
| **Regular User** | `user@demo.gr` | `User@123456` | `/dashboard` |

> There is **no separate admin login URL**. Role is detected from the session and the user is redirected automatically.

---

## 🔑 Environment Variables

### Local (`.env.local`)

```env
# SQLite for local dev
DATABASE_URL="file:./dev.db"

# NextAuth — generate with: openssl rand -base64 32
AUTH_SECRET="your-32-char-random-secret-here"

# App URL (local)
NEXTAUTH_URL="http://localhost:3000"
```

### Production / Vercel

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) | `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres` |
| `AUTH_SECRET` | Random 32+ char string for JWT signing | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your deployed app URL | `https://myerp.vercel.app` |

> **Never** commit `.env.local` to git. It is already in `.gitignore`.

---

## 🏗️ Architecture Overview

```
MyERP/
├── app/
│   ├── (dashboard)/              # Auth-protected pages (sidebar + header layout)
│   │   ├── admin/                # Master Admin SaaS panel
│   │   │   ├── page.tsx          # Business list + stats + customer management
│   │   │   └── users/page.tsx    # Master admin user management (/admin access)
│   │   ├── dashboard/            # KPI cards, revenue chart, low stock alerts
│   │   ├── inventory/            # Products, categories, stock movements
│   │   ├── clients/              # Customers & suppliers
│   │   ├── invoices/             # SALE/PURCHASE/CREDIT + PDF export
│   │   ├── costs/                # Expense management + pie chart
│   │   ├── analytics/            # Revenue vs Costs charts, top clients
│   │   ├── reports/              # 5 report types, CSV + PDF export
│   │   ├── users/                # Business user management (business_admin only)
│   │   └── settings/             # Business info, 2FA setup, data export/import
│   ├── api/
│   │   ├── admin/
│   │   │   ├── businesses/       # CRUD for businesses (master_admin only)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET detail + PATCH
│   │   │   │       ├── payments/         # CustomerPayment CRUD
│   │   │   │       ├── renewals/         # LicenseRenewal CRUD
│   │   │   │       └── phases/           # SubscriptionPhase CRUD
│   │   │   └── users/            # Master admin user management
│   │   │       └── [id]/route.ts # PATCH (toggle/password) + DELETE
│   │   ├── auth/                 # NextAuth route handler
│   │   ├── dashboard/            # KPI stats API
│   │   ├── inventory/            # Products + categories + stock
│   │   ├── clients/              # Client CRUD
│   │   ├── invoices/             # Invoice CRUD + PDF
│   │   ├── costs/                # Cost CRUD
│   │   ├── analytics/            # Analytics data
│   │   ├── reports/              # Report generation
│   │   ├── users/                # Business user CRUD
│   │   └── settings/             # Business settings
│   ├── login/                    # Public login page
│   ├── verify-2fa/               # TOTP verification page
│   └── setup-2fa/                # QR code 2FA setup
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # Role-aware sidebar (master_admin vs business users)
│   │   └── Header.tsx            # Top bar with locale switch + user menu
│   └── [module]/                 # Feature-specific modal components
├── lib/
│   ├── auth.ts                   # NextAuth v5 + speakeasy TOTP (Node.js only)
│   ├── auth.config.ts            # Lightweight auth for Edge Runtime (middleware)
│   ├── db.ts                     # Prisma singleton
│   ├── utils.ts                  # Shared helpers (cn, formatDate, formatCurrency)
│   ├── export-pdf.ts             # jsPDF export helpers
│   └── export-csv.ts             # PapaParse CSV helpers
├── messages/
│   ├── el.json                   # Greek translations (primary)
│   └── en.json                   # English translations
├── prisma/
│   ├── schema.prisma             # Full data model
│   └── seed.ts                   # Demo data seeder
└── middleware.ts                  # Auth + route protection (Edge Runtime)
```

---

## 👥 User Roles & Access

| Role | Access | Notes |
|---|---|---|
| `master_admin` | `/admin`, `/admin/users` only | Manages all businesses & SaaS subscriptions |
| `business_admin` | Full ERP + `/users` | Manages own business, creates users |
| `user` | ERP (no user management) | Read/write own business data |

### Role Routing
- `master_admin` → always redirected to `/admin` (middleware + `app/page.tsx`)
- `business_admin` / `user` → redirected to `/dashboard`
- Unauthenticated → redirected to `/login`

---

## 🗃️ Database Models

### SaaS / Platform Layer (master_admin manages)
| Model | Purpose |
|---|---|
| `Business` | SaaS customer — each business is a tenant. Has subscription tier, status, contact info |
| `SubscriptionPhase` | Implementation phases for Production-tier businesses |
| `LicenseRenewal` | History of subscription renewals with tier/status changes and amounts |
| `CustomerPayment` | Payments received FROM businesses (SaaS fees) |

### ERP Layer (business users manage — scoped by `businessId`)
| Model | Purpose |
|---|---|
| `User` | App users — linked to a Business. Roles: `master_admin`, `business_admin`, `user` |
| `Session` | Auth sessions |
| `Category` | Product categories |
| `Warehouse` | Storage locations |
| `Product` | SKU, barcode, buy/sell price, VAT, stock levels |
| `StockMovement` | IN / OUT / ADJUSTMENT / TRANSFER entries |
| `Client` | Customers and/or suppliers |
| `Invoice` | SALE / PURCHASE / CREDIT_NOTE with line items |
| `InvoiceItem` | Line items with VAT |
| `Payment` | Payments against invoices |
| `Transaction` | General ledger entries |
| `Cost` | Business expenses (payroll, rent, utilities, etc.) |
| `AuditLog` | Action history (user, action, entity, timestamp) |

### Subscription Tiers
| Tier | Features |
|---|---|
| `standard` | All ERP modules active, no phases |
| `production` | All ERP modules + SubscriptionPhases support |

### Subscription Statuses
`active` · `trial` · `inactive` · `expired`

---

## 🔑 Key Patterns

### Auth in API Routes
```ts
import { auth } from '@/lib/auth';

const session = await auth();
const user = session?.user as any;
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const businessId = user.businessId;
const role = user.role; // 'master_admin' | 'business_admin' | 'user'
```

### Business Isolation (ALWAYS filter by businessId)
```ts
const products = await db.product.findMany({
  where: { businessId },  // ← never omit this for business data
});
```

### Master Admin Only
```ts
if (user.role !== 'master_admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Edge Runtime Safety
- `middleware.ts` → import from `lib/auth.config.ts` (no speakeasy, no Node.js built-ins)
- API routes → import from `lib/auth.ts` (full NextAuth with TOTP)

---

## 🌐 i18n

- Primary language: **Greek** (`el`)
- Secondary: **English** (`en`)
- Locale stored in cookie `NEXT_LOCALE`
- Switch via Header dropdown → sets cookie → reloads page
- Translation files: `messages/el.json`, `messages/en.json`

---

## 🚀 Production Deployment (Vercel + Supabase)

### 1. Prepare Prisma for PostgreSQL

Edit `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // required for Supabase connection pooling
}
```

### 2. Set Vercel Environment Variables

```
DATABASE_URL   = postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL     = postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
AUTH_SECRET    = <output of: openssl rand -base64 32>
NEXTAUTH_URL   = https://your-app.vercel.app
```

### 3. Run Migrations on First Deploy

```bash
# Locally, pointing at production DB
DATABASE_URL="your-supabase-url" npx prisma migrate deploy
```

Or add to your Vercel build command:
```
prisma generate && prisma migrate deploy && next build
```

### 4. Seed Production Data (once)

```bash
DATABASE_URL="your-supabase-url" npx ts-node --skip-project \
  --compiler-options '{"module":"CommonJS","esModuleInterop":true}' \
  prisma/seed.ts
```

> See `SUPABASE-DATABASE.md` for the full SQL schema to create the database manually in Supabase.

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `next@14` | App Router framework |
| `next-auth@^5.0.0-beta.19` | JWT authentication |
| `speakeasy` | TOTP 2FA |
| `qrcode` | QR code for 2FA setup |
| `bcryptjs` | Password hashing |
| `prisma` + `@prisma/client` | ORM + type-safe queries |
| `next-intl` | Greek/English i18n |
| `recharts` | Dashboard charts |
| `jspdf` + `jspdf-autotable` | PDF export |
| `papaparse` | CSV export/import |
| `lucide-react` | Icons |
| `@radix-ui/*` | Accessible UI primitives |
| `tailwindcss` | Styling |

---

## 🐛 Known Issues / Gotchas

| Issue | Details | Fix |
|---|---|---|
| Stale Prisma Client | After `db push`, running server has old client cached | Restart the dev server |
| `speakeasy` in Edge Runtime | Cannot use in `middleware.ts` | Use `auth.config.ts` for middleware only |
| SQLite concurrent writes | Not suitable for production | Use PostgreSQL (Supabase) for prod |
| `db:seed` on Windows | Shell escaping differences | Use the `npx ts-node` command directly |

---

## 🔗 Repository

**https://github.com/EliasBolo/MyERP**

*Last updated: 2026-03-08*
