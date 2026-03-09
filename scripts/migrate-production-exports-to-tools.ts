/**
 * One-time migration: update Business.subscriptionTier from 'production_exports' to 'production_tools'
 * Run: npx ts-node --skip-project -e "
 *   require('dotenv').config({ path: '.env' });
 *   const { PrismaClient } = require('@prisma/client');
 *   const db = new PrismaClient();
 *   db.business.updateMany({ where: { subscriptionTier: 'production_exports' }, data: { subscriptionTier: 'production_tools' } })
 *     .then(r => { console.log('Updated', r.count, 'businesses'); process.exit(0); })
 *     .catch(e => { console.error(e); process.exit(1); });
 * "
 * Or: npx ts-node --skip-project --compiler-options '{"module":"CommonJS"}' scripts/migrate-production-exports-to-tools.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const result = await db.business.updateMany({
    where: { subscriptionTier: 'production_exports' },
    data: { subscriptionTier: 'production_tools' },
  });
  console.log('Migrated', result.count, 'business(es) from production_exports to production_tools');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
