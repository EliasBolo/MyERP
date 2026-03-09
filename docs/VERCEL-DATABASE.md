# Fix: "Can't reach database" on Vercel

**Cause:** Vercel does not support IPv6. The `db.xxx.supabase.co` host uses IPv6, so Vercel cannot connect to it. You must use the **pooler** host instead: `aws-0-[REGION].pooler.supabase.com` (IPv4).

---

## Step 1 — Get the pooler connection string from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Click **Connect** (green button) or open Project Settings → Database.
3. Find the **Connection string** section.
4. Switch the connection type dropdown to **Transaction** (or **Session** — both use the pooler host).
5. You should see a URL with host **`aws-0-[region].pooler.supabase.com`** (e.g. `aws-0-eu-west-1.pooler.supabase.com`).
6. Copy that **full** connection string.
7. Replace `[YOUR-PASSWORD]` with your database password.
8. For **Transaction** (port 6543): ensure it ends with `?pgbouncer=true` (or add it).

**Direct link to Transaction mode:**  
`https://supabase.com/dashboard/project/kuuguygnoztyyzmtpaqm?showConnect=true&method=transaction`

---

## Step 2 — Get both URLs

You need **two** strings for Prisma:

| Variable | Use | Format |
|----------|-----|--------|
| `DATABASE_URL` | App runtime (Vercel) | Pooler **Transaction** (port 6543) with `?pgbouncer=true` |
| `DIRECT_URL`   | Migrations          | Pooler **Session** (port 5432) or same Transaction URL |

**Example (replace REGION and PASSWORD with your values):**
```
DATABASE_URL=postgresql://postgres.kuuguygnoztyyzmtpaqm:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.kuuguygnoztyyzmtpaqm:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

Note: Username is `postgres.PROJECT_REF` (e.g. `postgres.kuuguygnoztyyzmtpaqm`), not just `postgres`.

---

## Step 3 — Add to Vercel

1. Vercel → your project → **Settings** → **Environment Variables**.
2. Update or add **DATABASE_URL** with the pooler string (Transaction, port 6543).
3. Update or add **DIRECT_URL** with the pooler string (Session, port 5432).
4. Ensure both use the **`aws-0-XXX.pooler.supabase.com`** host, not `db.xxx.supabase.co`.
5. **Redeploy** (Deployments → ⋯ → Redeploy).

---

## Step 4 — Verify

After redeploy, open:

**https://my-erp-kappa.vercel.app/api/debug-db**

You should see `"ok": true, "adminExists": true` instead of "Can't reach database".

---

## Summary

- **Local:** `db.xxx.supabase.co` works (IPv6 on your machine).
- **Vercel:** Must use `aws-0-REGION.pooler.supabase.com` (IPv4).
- Username on pooler: `postgres.PROJECT_REF`, not `postgres`.
