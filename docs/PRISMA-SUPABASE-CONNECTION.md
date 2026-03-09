# Prisma + Supabase connection — step-by-step

Follow these steps in order. Your `prisma/schema.prisma` is already set for PostgreSQL with `DATABASE_URL` and `DIRECT_URL`.

---

## Step 1 — Get connection strings from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. Get the **Connect** panel:
   - Click the green **Connect** button (top of the project page), **or**
   - Open: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF?showConnect=true`  
     (replace `YOUR_PROJECT_REF` with the ID in your project URL.)
3. In the Connect panel you’ll see connection options. You need **two** strings:

   **A. For `DATABASE_URL` (pooled — use for app runtime)**  
   - Choose **Transaction** or **Session** mode (pooler).  
   - Port should be **6543** for transaction mode.  
   - Copy the URI. It must end with `?pgbouncer=true` for transaction mode.  
   - Example shape:  
     `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true`

   **B. For `DIRECT_URL` (direct — use for migrations / Prisma)**  
   - Choose **Direct connection** (or Session on port 5432).  
   - Copy that URI.  
   - Example shape:  
     `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres`

4. Replace `[YOUR-PASSWORD]` (or the placeholder) in both strings with your **database password** (the one you set when creating the project).  
   - Forgot it? **Project Settings → Database → Reset database password.**

5. If your password contains `@`, `#`, `/`, `%`, or `:`, [URL-encode](https://www.urlencoder.org/) it (e.g. `Pass@word` → `Pass%40word`).

### If you only see the Direct URL (no pooled / “DATABASE_URL”)

Supabase’s Connect panel sometimes shows **Direct** by default. The pooled string (for `DATABASE_URL`) is under a different option:

- In the **Connect** panel, look for a **dropdown** or **tabs** at the top (e.g. “Direct”, “Session”, “Transaction” or “Connection pooling”). Select **Transaction** (port 6543) or **Session** (port 5432 on pooler) to see the other connection string.
- Or open the panel already set to transaction mode (replace `YOUR_PROJECT_REF` with your project ID from the browser URL):  
  `https://supabase.com/dashboard/project/YOUR_PROJECT_REF?showConnect=true&method=transaction`  
  That view should show the **pooled** URI (host like `…pooler.supabase.com`, port **6543**). Use that for `DATABASE_URL`.

**Fallback — use Direct for both:**  
If you still only have the Direct connection string, you can use it for **both** `DATABASE_URL` and `DIRECT_URL` so you can proceed. Prisma will work. For production on Vercel, a pooled URL (transaction mode) is better for connection limits; you can add it later from the same Connect panel when you find the Transaction/Session option.

---

## Step 2 — Configure local environment (`.env.local`)

1. In the project root, open or create `.env.local` (this file is gitignored).

2. Add or update these variables (use your real values from Step 1):

```env
# Database (Supabase Postgres)
DATABASE_URL="postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

# NextAuth (required for login)
AUTH_SECRET="your-32-character-secret-at-least"
NEXTAUTH_URL="http://localhost:3000"
```

3. Generate `AUTH_SECRET` if you don’t have one:
   ```bash
   openssl rand -base64 32
   ```
   Paste the output as `AUTH_SECRET`.

4. Save `.env.local`. Do **not** commit it (it should be in `.gitignore`).

---

## Step 3 — Install dependencies and generate Prisma Client

In the project root:

```bash
npm install
npx prisma generate
```

You should see: `Generated Prisma Client ... to ./node_modules/@prisma/client`.

---

## Step 4 — Create tables in Supabase (first-time only)

Push your Prisma schema to the Supabase database:

```bash
npx prisma db push
```

- If it succeeds, you’ll see something like: `Your database is now in sync with your schema.`
- If you get a connection error, check Step 1 and 2 (URLs, password, encoding).

---

## Step 5 — Seed the database (create login users)

Create the master admin and demo data so you can log in:

```bash
npm run db:seed
```

Or with explicit env (if you don’t use `.env.local` for this shell):

```bash
npx ts-node --skip-project --compiler-options '{"module":"CommonJS","esModuleInterop":true}' prisma/seed.ts
```

Default logins created by the seed:

| Role           | Email             | Password    |
|----------------|-------------------|-------------|
| Master Admin   | admin@myerp.gr    | Admin@123456 |
| Business Admin| bizadmin@demo.gr  | Admin@123456 |
| User          | user@demo.gr      | User@123456  |

---

## Step 6 — Verify connection locally

1. Start the app:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000), go to the login page, and sign in with e.g. `admin@myerp.gr` / `Admin@123456`.

3. Optional: open Prisma Studio to inspect data:
   ```bash
   npx prisma studio
   ```

If login works, your local Prisma ↔ Supabase connection is set up correctly.

---

## Step 7 — Configure Vercel (production)

1. Open your project on [Vercel Dashboard](https://vercel.com/dashboard) → **Settings → Environment Variables**.

2. Add the **same** variables as in Step 2, but with production values:

   | Name           | Value                                                                 | Environment  |
   |----------------|-----------------------------------------------------------------------|---------------|
   | `DATABASE_URL` | Your **pooled** Supabase URI (port 6543, `?pgbouncer=true`)           | Production    |
   | `DIRECT_URL`   | Your **direct** Supabase URI (port 5432)                              | Production    |
   | `AUTH_SECRET`  | Same as local or a new `openssl rand -base64 32` (keep secret)        | Production    |
   | `NEXTAUTH_URL` | Your production URL, e.g. `https://your-app.vercel.app`               | Production    |

3. Save. Redeploy the project (e.g. **Deployments → … → Redeploy**).

Your build already runs `prisma generate && next build`, so Prisma Client is generated on deploy. Tables must exist in Supabase (Step 4); run `db push` once from your machine pointing at the same Supabase project, or use a separate staging DB and run it there.

---

## Step 8 — Optional: run migrations instead of `db push`

If you prefer versioned migrations instead of `db push`:

1. Create an initial migration (one-time):
   ```bash
   npx prisma migrate dev --name init
   ```

2. On Vercel (or CI), run migrations before build. For example, set build command to:
   ```bash
   prisma generate && prisma migrate deploy && next build
   ```
   and add it in **Vercel → Settings → General → Build Command** if you want to override the default.

For a fresh Supabase DB, **Step 4 (`db push`)** is enough to get going; you can switch to `migrate deploy` later if you want.

---

## Troubleshooting

| Problem | What to check |
|--------|----------------|
| `Can't reach database server` | Wrong host/port, firewall, or Supabase project paused. Use correct pooled/direct URLs from Connect. |
| `Authentication failed` | Wrong password in `DATABASE_URL`/`DIRECT_URL`. Reset in Supabase → Project Settings → Database. |
| `relation "User" does not exist` | Run Step 4: `npx prisma db push`. |
| Login fails / “Invalid credentials” | Run Step 5: `npm run db:seed`. Use the seeded emails/passwords. |
| Build fails on Vercel (Prisma) | Ensure `DATABASE_URL` and `DIRECT_URL` are set in Vercel. Build runs `prisma generate`; DB must exist and be reachable for runtime. |

---

## Summary checklist

- [ ] Step 1: Get pooled + direct connection strings from Supabase (Connect).
- [ ] Step 2: Put `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` in `.env.local`.
- [ ] Step 3: `npm install` and `npx prisma generate`.
- [ ] Step 4: `npx prisma db push` (create tables).
- [ ] Step 5: `npm run db:seed` (create users).
- [ ] Step 6: `npm run dev` and test login at http://localhost:3000.
- [ ] Step 7: Add same env vars in Vercel and redeploy.
