#!/usr/bin/env node
/**
 * Test DB connection and verify admin user exists.
 * Run from project root: npm run db:test
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

if (existsSync(resolve(process.cwd(), '.env'))) {
  const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const { PrismaClient } = await import('@prisma/client');
const { createRequire } = await import('module');
const { compare } = createRequire(import.meta.url)('bcryptjs');

const db = new PrismaClient();

async function main() {
  console.log('Testing database connection...\n');

  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL. Ensure .env exists in project root.');
    process.exit(1);
  }

  try {
    await db.$connect();
    console.log('Connection: OK\n');

    const admin = await db.user.findUnique({ where: { email: 'admin@myerp.gr' } });
    if (!admin) {
      console.log('User admin@myerp.gr: NOT FOUND');
      console.log('Run: npm run db:seed');
      return;
    }
    console.log('User admin@myerp.gr: FOUND');
    console.log('  id:', admin.id);
    console.log('  isActive:', admin.isActive);
    console.log('  role:', admin.role);
    console.log('');

    const testPassword = 'Admin@123456';
    const isValid = await compare(testPassword, admin.password);
    console.log('Password check (Admin@123456):', isValid ? 'OK' : 'INVALID');
    if (!isValid) {
      console.log('The password in DB does not match Admin@123456. Re-run: npm run db:seed');
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (err.message?.includes('Authentication failed')) {
      console.error('Fix: Check database password in DATABASE_URL and DIRECT_URL.');
    } else if (err.message?.includes("Can't reach")) {
      console.error('Fix: Check Supabase host/port and that project is not paused.');
    } else if (err.message?.includes('prepared statement')) {
      console.error('Fix: Add ?pgbouncer=true to DATABASE_URL (required for Supabase pooled connection).');
    }
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
  console.log('\nDB connection and user look OK.');
}

main();
