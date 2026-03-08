# MyERP — Developer Instructions & Next Steps

> This file is intended for Cursor or any AI-assisted IDE to understand the project context and continue development safely.

---

## 📁 Project Location

```
/Users/mac/Documents/GitHub/MyERP
```

---

## ⚡ Quick Start (Every Session)

```bash
# 1. Install dependencies (only first time or after package.json changes)
npm install

# 2. Apply database schema (only if schema.prisma changed)
DATABASE_URL="file:./dev.db" npx prisma db push

# 3. Seed demo data (only first time or after resetting the DB)
DATABASE_URL="file:./dev.db" npx ts-node --skip-project --compiler-options '{"module":"CommonJS","esModuleInterop":true}' prisma/seed.ts

# 4. Start development server
npm run dev
```

Open: http://localhost:3000

---

## 🔐 Demo Login Credentials

| Role            | Email               | Password      |
|-----------------|---------------------|---------------|
| Master Admin    | admin@myerp.gr      | Admin@123456  |
| Business Admin  | bizadmin@demo.gr    | Admin@123456  |
| Regular User    | user@demo.gr        | User@123456   |

> **2FA is not yet enabled for demo accounts.** Enable it from Settings → Security after logging in.

---

## 🏗️ Architecture Overview

```
MyERP/
├── app/
│   ├── (dashboard)/        # All auth-protected pages (layout wraps with sidebar+header)
│   │   ├── dashboard/      # KPI cards + charts + low stock alerts
│   │   ├── inventory/      # Products, categories, stock movements
│   │   ├── clients/        # Customers & suppliers
│   │   ├── invoices/       # Sales, purchases, credit notes + PDF export
│   │   ├── costs/          # Expense management + pie chart
│   │   ├── analytics/      # Revenue vs Costs charts, top clients
│   │   ├── reports/        # 5 report types, CSV + PDF export
│   │   ├── users/          # User management (role-based)
│   │   └── settings/       # Business info, 2FA setup, data export/import
│   ├── api/                # All API routes (Next.js Route Handlers)
│   ├── login/              # Public login page
│   ├── verify-2fa/         # TOTP verification page
│   └── setup-2fa/          # QR code setup page
├── components/
│   ├── layout/             # Sidebar.tsx, Header.tsx
│   ├── inventory/          # ProductModal.tsx, StockMovementModal.tsx
│   ├── clients/            # ClientModal.tsx
│   ├── costs/              # CostModal.tsx
│   ├── invoices/           # InvoiceModal.tsx
│   └── users/              # UserModal.tsx
├── lib/
│   ├── auth.ts             # NextAuth v5 config with speakeasy TOTP (Node.js only)
│   ├── auth.config.ts      # Lightweight auth config for Edge Runtime (middleware)
│   ├── db.ts               # Prisma singleton client
│   ├── utils.ts            # Shared utility functions
│   ├── export-pdf.ts       # jsPDF export helpers
│   └── export-csv.ts       # PapaParse CSV helpers
├── messages/
│   ├── el.json             # Greek translations (primary)
│   └── en.json             # English translations (secondary)
├── prisma/
│   ├── schema.prisma       # Full ERP data model
│   └── seed.ts             # Demo data seeder
└── middleware.ts            # Auth + route protection (Edge Runtime safe)
```

---

## 🗃️ Database Models (Prisma + SQLite)

- **Business** — Multi-tenant root entity
- **User** — Linked to a Business, roles: `master_admin`, `business_admin`, `user`
- **Category** — Product categories per business
- **Warehouse** — Storage locations per business
- **Product** — SKU, barcode, buy/sell prices, VAT rate, stock levels
- **StockMovement** — IN / OUT / ADJUSTMENT entries per product
- **Client** — Customers AND/OR suppliers (type field)
- **Invoice** — SALE / PURCHASE / CREDIT with line items
- **InvoiceItem** — Line items with VAT calculation
- **Payment** — Payments linked to invoices
- **Transaction** — General ledger entries
- **Cost** — Business expenses by category (payroll, rent, utilities, marketing, operations)
- **AuditLog** — Tracks all create/update/delete actions

---

## 🔑 Key Patterns to Follow

### Auth in API Routes
```ts
import { auth } from '@/lib/auth';

const session = await auth();
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const businessId = (session.user as any).businessId;
const role = (session.user as any).role;
```

### Business Isolation (ALWAYS filter by businessId)
```ts
const products = await db.product.findMany({
  where: { businessId },  // ← never omit this
  orderBy: { name: 'asc' },
});
```

### Role Check Pattern
```ts
if (role !== 'business_admin' && role !== 'master_admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Adding a New Translation Key
Add to both `messages/el.json` AND `messages/en.json`, then use:
```ts
const t = useTranslations('YourNamespace');
// <p>{t('yourKey')}</p>
```

### Edge Runtime Warning
- `middleware.ts` MUST import from `lib/auth.config.ts` (no speakeasy, no Node.js built-ins)
- `lib/auth.ts` (with speakeasy) is only used in API routes (Node.js runtime)

---

## 📋 Pending / Suggested Next Steps

### 🔴 High Priority (Functionality Gaps)

1. **Invoice PDF — fix line item totals**
   - File: `lib/export-pdf.ts`
   - The subtotal/VAT breakdown per line needs verification against actual DB values

2. **Stock movement on invoice creation**
   - File: `app/api/invoices/route.ts`
   - When a SALE invoice is marked `paid` or `sent`, stock should auto-decrease
   - When a PURCHASE invoice is created, stock should auto-increase

3. **Dashboard chart — connect real data**
   - File: `app/(dashboard)/dashboard/page.tsx`
   - The Recharts `AreaChart` (Revenue vs Costs) uses monthly grouping — verify API returns correct monthly buckets
   - API file: `app/api/dashboard/route.ts`

4. **Reports page — date range filtering**
   - File: `app/(dashboard)/reports/page.tsx` + `app/api/reports/route.ts`
   - Currently the date range inputs exist but backend filtering needs validation

5. **Audit Log UI**
   - The `AuditLog` model exists in Prisma but there's no UI page yet
   - Add `app/(dashboard)/audit/page.tsx` and `app/api/audit/route.ts`
   - Show: user, action, entity, timestamp

---

### 🟡 Medium Priority (UX Improvements)

6. **Mobile sidebar**
   - File: `components/layout/Sidebar.tsx`
   - The hamburger menu button in `Header.tsx` toggles `sidebarOpen` state but the sidebar overlay on mobile needs testing and possible z-index fixes

7. **Invoice status auto-update to "overdue"**
   - Add a cron-like check: invoices with `dueDate < now` and status `sent` should show as `overdue`
   - Can be done at query time in `app/api/invoices/route.ts` with a `prisma.$transaction`

8. **Pagination on large tables**
   - Inventory, Clients, Invoices pages load all records — add pagination for performance
   - Recommended: server-side with `skip`/`take` in Prisma queries

9. **Toast notifications**
   - Radix UI `@radix-ui/react-toast` is already installed
   - Add a global `<Toaster />` in `app/(dashboard)/layout.tsx` and a `useToast` hook
   - Replace `alert()` / console.log success messages in modals with toasts

10. **Confirm delete dialogs**
    - Currently delete buttons call API immediately
    - Add a `<ConfirmDialog />` wrapper using `@radix-ui/react-dialog` (already installed)

---

### 🟢 Nice to Have (Future Features)

11. **Email notifications** — Invoice sent, overdue reminders (add nodemailer or Resend)
12. **Multi-warehouse stock tracking** — The `Warehouse` model exists but inventory UI only shows total stock
13. **Purchase order workflow** — Separate PO creation before PURCHASE invoice
14. **Client portal** — Read-only invoice view for clients via token link
15. **PostgreSQL migration for production** — Change `provider` in `schema.prisma` from `sqlite` to `postgresql` and update `DATABASE_URL`
16. **Barcode scanning** — Use `@zxing/browser` for camera-based barcode lookup in inventory

---

## 🌐 i18n Notes

- Language is stored in a **cookie** (`NEXT_LOCALE`)
- Switching language: Header dropdown calls `document.cookie = 'NEXT_LOCALE=en'` then `window.location.reload()`
- To add a new language: add a new JSON file in `messages/`, update `i18n/request.ts` and `next.config.mjs`

---

## 🚀 Deployment (Production)

### Switch to PostgreSQL
1. Edit `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
2. Update `.env.local`:
```
DATABASE_URL="postgresql://user:password@host:5432/myerp"
```
3. Run migrations:
```bash
npx prisma migrate dev --name init
```

### Environment Variables Required
```env
DATABASE_URL="..."
AUTH_SECRET="min-32-char-random-string"
NEXTAUTH_URL="https://yourdomain.com"
MASTER_ADMIN_EMAIL="admin@yourdomain.com"
MASTER_ADMIN_PASSWORD="StrongPassword123!"
```

### Recommended Platforms
- **Vercel** (frontend) + **Railway** or **Supabase** (PostgreSQL)
- Or **Railway** for full-stack (Next.js + PostgreSQL in one project)

---

## 🐛 Known Issues / Gotchas

| Issue | Details | Fix |
|-------|---------|-----|
| `db:seed` script | Shell escaping differs between Mac/Linux/Windows | Always use the direct `npx ts-node` command shown in Quick Start |
| `speakeasy` in Edge Runtime | Cannot be imported in `middleware.ts` | Use `lib/auth.config.ts` for middleware, `lib/auth.ts` for API routes only |
| SQLite concurrent writes | SQLite doesn't support concurrent writes well | Fine for dev/single-user; use PostgreSQL for production |
| `manifest.json` missing | `app/layout.tsx` references `/manifest.json` | Either create `public/manifest.json` or remove the manifest line |

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `next-auth@^5.0.0-beta.19` | Authentication (JWT sessions) |
| `speakeasy` | TOTP 2FA code generation/verification |
| `qrcode` | QR code generation for 2FA setup |
| `bcryptjs` | Password hashing |
| `prisma` + `@prisma/client` | ORM + type-safe DB queries |
| `next-intl` | i18n (Greek/English) |
| `recharts` | Dashboard charts |
| `jspdf` + `jspdf-autotable` | PDF export |
| `papaparse` | CSV export/import |
| `@radix-ui/*` | Accessible UI primitives |
| `react-hook-form` + `zod` | Form handling + validation |
| `zustand` | Client-side state (modals, UI state) |
| `lucide-react` | Icon library |

---

## 🔗 GitHub Repository

**https://github.com/EliasBolo/MyERP**

```bash
# Clone fresh
git clone https://github.com/EliasBolo/MyERP.git
cd MyERP
```

---

*Last updated: 2026-03-08*
