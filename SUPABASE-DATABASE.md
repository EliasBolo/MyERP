# MyERP — Supabase Database Setup

This guide covers creating the full database schema in Supabase for production deployment.

---

## Option A — Prisma Migrate (Recommended)

Let Prisma handle schema creation automatically:

```bash
# 1. Switch schema.prisma to PostgreSQL (see INSTRUCTIONS.md)
# 2. Point at your Supabase DB
export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# 3. Create and apply migration
npx prisma migrate dev --name init

# 4. Generate client
npx prisma generate
```

Prisma will create all tables, indexes, and foreign keys automatically.

---

## Option B — Manual SQL (Supabase SQL Editor)

If you prefer to create the schema manually, run the following SQL in **Supabase → SQL Editor**.

### Step 1 — Create all tables

```sql
-- ─── BUSINESS (SaaS tenant root) ─────────────────────────────────────────────
CREATE TABLE "Business" (
  "id"                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"               TEXT        NOT NULL,
  "vatNumber"          TEXT        UNIQUE,
  "address"            TEXT,
  "phone"              TEXT,
  "email"              TEXT,
  "logo"               TEXT,
  "currency"           TEXT        NOT NULL DEFAULT 'EUR',
  "locale"             TEXT        NOT NULL DEFAULT 'el',
  "isActive"           BOOLEAN     NOT NULL DEFAULT true,
  "contactPerson"      TEXT,
  "notes"              TEXT,
  "subscriptionTier"   TEXT        NOT NULL DEFAULT 'standard',
  "subscriptionStatus" TEXT        NOT NULL DEFAULT 'active',
  "licenseExpiresAt"   TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUBSCRIPTION PHASES ─────────────────────────────────────────────────────
CREATE TABLE "SubscriptionPhase" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId"  TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "startDate"   TIMESTAMPTZ NOT NULL,
  "endDate"     TIMESTAMPTZ,
  "status"      TEXT        NOT NULL DEFAULT 'pending',
  "order"       INTEGER     NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LICENSE RENEWALS ────────────────────────────────────────────────────────
CREATE TABLE "LicenseRenewal" (
  "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "renewedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "tierFrom"   TEXT,
  "tierTo"     TEXT        NOT NULL,
  "statusFrom" TEXT,
  "statusTo"   TEXT        NOT NULL,
  "amountPaid" FLOAT,
  "currency"   TEXT        NOT NULL DEFAULT 'EUR',
  "notes"      TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CUSTOMER PAYMENTS (SaaS fees paid by each business) ─────────────────────
CREATE TABLE "CustomerPayment" (
  "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "amount"     FLOAT       NOT NULL,
  "currency"   TEXT        NOT NULL DEFAULT 'EUR',
  "method"     TEXT        NOT NULL DEFAULT 'bank',
  "status"     TEXT        NOT NULL DEFAULT 'paid',
  "reference"  TEXT,
  "notes"      TEXT,
  "paidAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE "User" (
  "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email"            TEXT        UNIQUE NOT NULL,
  "password"         TEXT        NOT NULL,
  "name"             TEXT        NOT NULL,
  "role"             TEXT        NOT NULL DEFAULT 'user',
  "businessId"       TEXT        REFERENCES "Business"("id") ON DELETE CASCADE,
  "isActive"         BOOLEAN     NOT NULL DEFAULT true,
  "twoFactorEnabled" BOOLEAN     NOT NULL DEFAULT false,
  "twoFactorSecret"  TEXT,
  "lastLogin"        TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SESSIONS ────────────────────────────────────────────────────────────────
CREATE TABLE "Session" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token"     TEXT        UNIQUE NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
CREATE TABLE "Category" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "businessId"  TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── WAREHOUSES ──────────────────────────────────────────────────────────────
CREATE TABLE "Warehouse" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT        NOT NULL,
  "address"     TEXT,
  "description" TEXT,
  "businessId"  TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
CREATE TABLE "Product" (
  "id"           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sku"          TEXT        NOT NULL,
  "name"         TEXT        NOT NULL,
  "description"  TEXT,
  "categoryId"   TEXT        REFERENCES "Category"("id"),
  "businessId"   TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "unit"         TEXT        NOT NULL DEFAULT 'τεμ',
  "buyPrice"     FLOAT       NOT NULL DEFAULT 0,
  "sellPrice"    FLOAT       NOT NULL DEFAULT 0,
  "vatRate"      FLOAT       NOT NULL DEFAULT 24,
  "currentStock" FLOAT       NOT NULL DEFAULT 0,
  "minStock"     FLOAT       NOT NULL DEFAULT 0,
  "maxStock"     FLOAT,
  "barcode"      TEXT,
  "isActive"     BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("sku", "businessId")
);

-- ─── STOCK MOVEMENTS ─────────────────────────────────────────────────────────
CREATE TABLE "StockMovement" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "productId"   TEXT        NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "warehouseId" TEXT        REFERENCES "Warehouse"("id"),
  "type"        TEXT        NOT NULL,
  "quantity"    FLOAT       NOT NULL,
  "unitPrice"   FLOAT       NOT NULL DEFAULT 0,
  "reference"   TEXT,
  "notes"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE "Client" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"        TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "vatNumber"   TEXT,
  "taxOffice"   TEXT,
  "address"     TEXT,
  "city"        TEXT,
  "postalCode"  TEXT,
  "country"     TEXT        NOT NULL DEFAULT 'GR',
  "phone"       TEXT,
  "mobile"      TEXT,
  "email"       TEXT,
  "contactName" TEXT,
  "notes"       TEXT,
  "type"        TEXT        NOT NULL DEFAULT 'customer',
  "creditLimit" FLOAT,
  "businessId"  TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("code", "businessId")
);

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE TABLE "Invoice" (
  "id"           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "number"       TEXT        NOT NULL,
  "type"         TEXT        NOT NULL,
  "clientId"     TEXT        NOT NULL REFERENCES "Client"("id"),
  "businessId"   TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "issueDate"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "dueDate"      TIMESTAMPTZ,
  "status"       TEXT        NOT NULL DEFAULT 'draft',
  "subtotal"     FLOAT       NOT NULL DEFAULT 0,
  "vatAmount"    FLOAT       NOT NULL DEFAULT 0,
  "total"        FLOAT       NOT NULL DEFAULT 0,
  "paidAmount"   FLOAT       NOT NULL DEFAULT 0,
  "notes"        TEXT,
  "paymentTerms" TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("number", "businessId")
);

-- ─── INVOICE ITEMS ───────────────────────────────────────────────────────────
CREATE TABLE "InvoiceItem" (
  "id"          TEXT  PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "invoiceId"   TEXT  NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
  "productId"   TEXT  REFERENCES "Product"("id"),
  "description" TEXT  NOT NULL,
  "quantity"    FLOAT NOT NULL,
  "unitPrice"   FLOAT NOT NULL,
  "vatRate"     FLOAT NOT NULL DEFAULT 24,
  "vatAmount"   FLOAT NOT NULL DEFAULT 0,
  "total"       FLOAT NOT NULL
);

-- ─── PAYMENTS (against invoices) ─────────────────────────────────────────────
CREATE TABLE "Payment" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "invoiceId" TEXT        NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
  "amount"    FLOAT       NOT NULL,
  "method"    TEXT        NOT NULL,
  "reference" TEXT,
  "paidAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "notes"     TEXT
);

-- ─── TRANSACTIONS ────────────────────────────────────────────────────────────
CREATE TABLE "Transaction" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId"  TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "type"        TEXT        NOT NULL,
  "category"    TEXT        NOT NULL,
  "description" TEXT        NOT NULL,
  "amount"      FLOAT       NOT NULL,
  "date"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reference"   TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── COSTS ───────────────────────────────────────────────────────────────────
CREATE TABLE "Cost" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId"  TEXT        NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "category"    TEXT        NOT NULL,
  "description" TEXT        NOT NULL,
  "amount"      FLOAT       NOT NULL,
  "date"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "recurrence"  TEXT,
  "vendor"      TEXT,
  "notes"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOG ───────────────────────────────────────────────────────────────
CREATE TABLE "AuditLog" (
  "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT        NOT NULL REFERENCES "User"("id"),
  "businessId" TEXT        REFERENCES "Business"("id"),
  "action"     TEXT        NOT NULL,
  "entity"     TEXT        NOT NULL,
  "entityId"   TEXT,
  "details"    TEXT,
  "ipAddress"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Step 2 — Create Indexes (performance)

```sql
-- User lookups
CREATE INDEX idx_user_business   ON "User"("businessId");
CREATE INDEX idx_user_email      ON "User"("email");
CREATE INDEX idx_user_role       ON "User"("role");

-- Business lookups
CREATE INDEX idx_business_status ON "Business"("subscriptionStatus");
CREATE INDEX idx_business_tier   ON "Business"("subscriptionTier");

-- Product lookups
CREATE INDEX idx_product_business  ON "Product"("businessId");
CREATE INDEX idx_product_category  ON "Product"("categoryId");
CREATE INDEX idx_product_sku       ON "Product"("sku");

-- Stock movements
CREATE INDEX idx_stock_product    ON "StockMovement"("productId");
CREATE INDEX idx_stock_warehouse  ON "StockMovement"("warehouseId");

-- Client lookups
CREATE INDEX idx_client_business  ON "Client"("businessId");
CREATE INDEX idx_client_type      ON "Client"("type");

-- Invoice lookups
CREATE INDEX idx_invoice_business ON "Invoice"("businessId");
CREATE INDEX idx_invoice_client   ON "Invoice"("clientId");
CREATE INDEX idx_invoice_status   ON "Invoice"("status");
CREATE INDEX idx_invoice_type     ON "Invoice"("type");

-- Invoice items
CREATE INDEX idx_invoice_item_invoice ON "InvoiceItem"("invoiceId");
CREATE INDEX idx_invoice_item_product ON "InvoiceItem"("productId");

-- Payments
CREATE INDEX idx_payment_invoice  ON "Payment"("invoiceId");

-- Costs
CREATE INDEX idx_cost_business    ON "Cost"("businessId");
CREATE INDEX idx_cost_category    ON "Cost"("category");

-- Transactions
CREATE INDEX idx_transaction_business ON "Transaction"("businessId");

-- Audit log
CREATE INDEX idx_audit_user       ON "AuditLog"("userId");
CREATE INDEX idx_audit_business   ON "AuditLog"("businessId");
CREATE INDEX idx_audit_created    ON "AuditLog"("createdAt" DESC);

-- SaaS tables
CREATE INDEX idx_renewal_business   ON "LicenseRenewal"("businessId");
CREATE INDEX idx_custpay_business   ON "CustomerPayment"("businessId");
CREATE INDEX idx_phase_business     ON "SubscriptionPhase"("businessId");

-- Sessions
CREATE INDEX idx_session_user     ON "Session"("userId");
CREATE INDEX idx_session_token    ON "Session"("token");
```

---

### Step 3 — Auto-update `updatedAt` columns

```sql
-- Function to auto-update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updatedAt
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Business','User','Category','Warehouse','Product',
    'Client','Invoice','Cost','SubscriptionPhase'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON "%s"
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      lower(tbl), tbl
    );
  END LOOP;
END;
$$;
```

---

### Step 4 — Seed Master Admin (run once)

```sql
-- Replace the password hash with bcrypt hash of your chosen password
-- Generate hash: node -e "const b=require('bcryptjs');b.hash('YourPassword123!',12).then(console.log)"

INSERT INTO "Business" (
  "id", "name", "subscriptionTier", "subscriptionStatus", "isActive"
) VALUES (
  'master-business-id', 'MyERP Platform', 'production', 'active', true
);

INSERT INTO "User" (
  "email", "password", "name", "role", "businessId", "isActive"
) VALUES (
  'admin@myerp.gr',
  '$2a$12$REPLACE_WITH_BCRYPT_HASH_OF_YOUR_PASSWORD',
  'Κεντρικός Διαχειριστής',
  'master_admin',
  NULL,
  true
);
```

> **Important**: Generate the bcrypt hash locally before inserting:
> ```bash
> node -e "const b=require('bcryptjs'); b.hash('Admin@123456',12).then(console.log)"
> ```

---

## Supabase Connection Strings

After creating your Supabase project, find these in:
**Supabase Dashboard → Project → Settings → Database → Connection string**

| Variable | Where to use | Which string |
|---|---|---|
| `DATABASE_URL` | Vercel env var | **Pooling** (port 6543) with `?pgbouncer=true` |
| `DIRECT_URL` | Vercel env var | **Direct** (port 5432) |

```env
# Vercel Environment Variables
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
AUTH_SECRET="your-32-char-secret"
NEXTAUTH_URL="https://your-app.vercel.app"
```

And in `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## Row Level Security (Optional — Recommended for Supabase)

Supabase enables RLS by default. Since MyERP uses its own auth (NextAuth) and server-side API routes, you can **disable RLS** on all tables since the app controls all access:

```sql
-- Disable RLS (app handles all auth/isolation via API routes)
ALTER TABLE "Business"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "User"              DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Product"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement"     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Client"            DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Cost"              DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionPhase" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "LicenseRenewal"    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerPayment"   DISABLE ROW LEVEL SECURITY;
```

---

*See `INSTRUCTIONS.md` for full deployment guide.*
