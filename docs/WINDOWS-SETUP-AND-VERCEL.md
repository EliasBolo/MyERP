# MyERP — Windows: Create tables, seed users, and set up Vercel

Do these steps **in order**. You should already have `.env.local` with `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and `NEXTAUTH_URL`.

---

## Part A — Create database tables and users (on your Windows PC)

### Step A1 — Open a terminal in your project folder

**Option 1 — VS Code (recommended)**  
1. Open your MyERP project folder in VS Code (File → Open Folder).  
2. Menu: **Terminal** → **New Terminal** (or press **Ctrl+`**).  
3. The terminal opens at your project root (you should see something like `...\MyERP>`).

**Option 2 — Command Prompt or PowerShell**  
1. Press **Win + R**, type `cmd` or `powershell`, press Enter.  
2. Go to your project folder, for example:  
   ```text
   cd C:\Users\YourName\Documents\GitHub\MyERP
   ```  
   (Replace with the real path where MyERP is.)

---

### Step A2 — Install dependencies (if you haven’t already)

In the same terminal, run:

```text
npm install
```

Wait until it finishes (no red errors).

---

### Step A3 — Generate Prisma Client

Run:

```text
npx prisma generate
```

You should see a line like: **Generated Prisma Client ... to ./node_modules/@prisma/client**.  
If you see an error about `DATABASE_URL` or `DIRECT_URL`, check `.env.local` in the project root.

---

### Step A4 — Create the tables in Supabase

This sends your Prisma schema to Supabase and creates all tables (User, Business, Client, etc.).

Run:

```text
npx prisma db push
```

- **Success:** You’ll see something like **Your database is now in sync with your schema.**  
- **If it fails:**  
  - “Can’t reach database” → check `DATABASE_URL` and `DIRECT_URL` in `.env.local` (and that Supabase project is running).  
  - “Authentication failed” → wrong database password in the URLs; reset it in Supabase → Project Settings → Database.

---

### Step A5 — Create users (seed the database)

This creates the login users (admin, business admin, demo user) in Supabase.

Run:

```text
npm run db:seed
```

You should see lines like:

- ✅ Master admin created: admin@myerp.gr  
- ✅ Demo business created: ...  
- ✅ Business admin created: bizadmin@demo.gr  
- ✅ Regular user created: user@demo.gr  

If you see any **red error**, read it: often it’s a missing table (go back to Step A4) or a connection problem (check `.env.local`).

**Default logins:**

| Email             | Password     |
|-------------------|-------------|
| admin@myerp.gr    | Admin@123456 |
| bizadmin@demo.gr  | Admin@123456 |
| user@demo.gr      | User@123456  |

---

### Step A6 — Test locally

1. Start the app:
   ```text
   npm run dev
   ```
2. Open the browser at **http://localhost:3000**.  
3. Log in with **admin@myerp.gr** / **Admin@123456**.  

If login works, your database and users are set up correctly. You can then configure Vercel (Part B).

---

## Part B — Set up environment variables in Vercel (for deployment)

You **do** need to add the same environment variables in Vercel so the deployed app can connect to Supabase and NextAuth can work.

### Step B1 — Open your project on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in.  
2. Open the **project** that is linked to your MyERP repo (the one that deploys when you push to GitHub).

---

### Step B2 — Open Environment Variables

1. Click the project name to open the project dashboard.  
2. Click the **Settings** tab at the top.  
3. In the left sidebar, click **Environment Variables**.

---

### Step B3 — Add each variable one by one

Add these **four** variables. For each one:

- Click **Add New** (or **Add**).  
- Enter **Key** (name) and **Value**.  
- Choose **Production** (and **Preview** if you use preview deployments).  
- Save.

| Key            | Value (what to put) |
|----------------|---------------------|
| `DATABASE_URL` | The same value as in your `.env.local` (Supabase pooled or direct URL). |
| `DIRECT_URL`   | The same value as in your `.env.local` (Supabase direct URL). |
| `AUTH_SECRET`  | The same value as in your `.env.local` (the long random string). |
| `NEXTAUTH_URL` | Your **production** app URL, e.g. `https://your-app-name.vercel.app` (no trailing slash). |

**Important:**

- **NEXTAUTH_URL** must be the **real** Vercel URL of your app (e.g. `https://myerp-xxx.vercel.app`). You see it on the Vercel project dashboard (Overview or Domains).  
- Do **not** put `http://localhost:3000` for Production.  
- Copy the values from `.env.local` (except use the production URL for `NEXTAUTH_URL`).

---

### Step B4 — Redeploy so Vercel uses the new variables

1. Go to the **Deployments** tab.  
2. Click the **three dots (⋯)** on the latest deployment.  
3. Click **Redeploy**.  
4. Confirm **Redeploy**.  

Wait until the new deployment is **Ready**. Then open your live app URL and try logging in with **admin@myerp.gr** / **Admin@123456**.

---

## Summary checklist

**On your Windows PC (Part A):**

- [ ] Terminal open in project folder (`MyERP`)  
- [ ] `npm install`  
- [ ] `npx prisma generate`  
- [ ] `npx prisma db push` (creates tables in Supabase)  
- [ ] `npm run db:seed` (creates users)  
- [ ] `npm run dev` and test login at http://localhost:3000  

**On Vercel (Part B):**

- [ ] Project → Settings → Environment Variables  
- [ ] Add `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (production URL for `NEXTAUTH_URL`)  
- [ ] Redeploy from Deployments tab  
- [ ] Test login on the live URL  

If any step fails, note the **exact** error message and which step (e.g. A4, B3) so you can fix or ask for help with that part.
