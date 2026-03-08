import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create master admin
  const masterPassword = await hash(process.env.MASTER_ADMIN_PASSWORD || 'Admin@123456', 12);
  const masterAdmin = await db.user.upsert({
    where: { email: process.env.MASTER_ADMIN_EMAIL || 'admin@myerp.gr' },
    update: {},
    create: {
      email: process.env.MASTER_ADMIN_EMAIL || 'admin@myerp.gr',
      password: masterPassword,
      name: 'Κεντρικός Διαχειριστής',
      role: 'master_admin',
      isActive: true,
    },
  });
  console.log('✅ Master admin created:', masterAdmin.email);

  // Create demo business
  const business = await db.business.upsert({
    where: { id: 'demo-business-001' },
    update: {},
    create: {
      id: 'demo-business-001',
      name: 'Demo Επιχείρηση Α.Ε.',
      vatNumber: '123456789',
      address: 'Πανεπιστημίου 50, Αθήνα',
      phone: '210-1234567',
      email: 'info@demo.gr',
      currency: 'EUR',
      locale: 'el',
    },
  });
  console.log('✅ Demo business created:', business.name);

  // Create business admin
  const adminPassword = await hash('Admin@123456', 12);
  const businessAdmin = await db.user.upsert({
    where: { email: 'bizadmin@demo.gr' },
    update: {},
    create: {
      email: 'bizadmin@demo.gr',
      password: adminPassword,
      name: 'Διαχειριστής Επιχείρησης',
      role: 'business_admin',
      businessId: business.id,
      isActive: true,
    },
  });
  console.log('✅ Business admin created:', businessAdmin.email);

  // Create regular user
  const userPassword = await hash('User@123456', 12);
  const regularUser = await db.user.upsert({
    where: { email: 'user@demo.gr' },
    update: {},
    create: {
      email: 'user@demo.gr',
      password: userPassword,
      name: 'Χρήστης Demo',
      role: 'user',
      businessId: business.id,
      isActive: true,
    },
  });
  console.log('✅ Regular user created:', regularUser.email);

  // Create categories
  const categories = [
    { name: 'Ηλεκτρολογικά', description: 'Ηλεκτρολογικά υλικά' },
    { name: 'Υδραυλικά', description: 'Υδραυλικά υλικά' },
    { name: 'Εργαλεία', description: 'Χειροκίνητα και ηλεκτρικά εργαλεία' },
    { name: 'Χρώματα', description: 'Χρώματα και βερνίκια' },
  ];

  for (const cat of categories) {
    await db.category.upsert({
      where: { id: `cat-${cat.name}` },
      update: {},
      create: { id: `cat-${cat.name}`, name: cat.name, description: cat.description, businessId: business.id },
    });
  }
  console.log('✅ Categories created');

  // Create products
  const products = [
    { sku: 'EL-001', name: 'Καλώδιο NYM 3x2.5', unit: 'ml', buyPrice: 1.20, sellPrice: 1.80, vatRate: 24, currentStock: 500, minStock: 100 },
    { sku: 'EL-002', name: 'Ρευματοδότης 16A', unit: 'τεμ', buyPrice: 2.50, sellPrice: 4.20, vatRate: 24, currentStock: 50, minStock: 20 },
    { sku: 'YD-001', name: 'Σωλήνας PPR 20mm', unit: 'ml', buyPrice: 0.85, sellPrice: 1.40, vatRate: 24, currentStock: 200, minStock: 50 },
    { sku: 'ER-001', name: 'Δράπανο Bosch 750W', unit: 'τεμ', buyPrice: 45.00, sellPrice: 69.00, vatRate: 24, currentStock: 8, minStock: 3 },
    { sku: 'CH-001', name: 'Χρώμα Λευκό 10lt', unit: 'τεμ', buyPrice: 22.00, sellPrice: 35.00, vatRate: 24, currentStock: 5, minStock: 10 },
    { sku: 'EL-003', name: 'Ασφαλειοθήκη 12 θέσεων', unit: 'τεμ', buyPrice: 35.00, sellPrice: 52.00, vatRate: 24, currentStock: 0, minStock: 5 },
  ];

  for (const prod of products) {
    await db.product.upsert({
      where: { sku_businessId: { sku: prod.sku, businessId: business.id } },
      update: {},
      create: { ...prod, businessId: business.id },
    });
  }
  console.log('✅ Products created');

  // Create clients
  const clients = [
    { code: 'CL-001', name: 'Τεχνική Κατασκευαστική Α.Ε.', vatNumber: '800123456', type: 'customer', city: 'Αθήνα', phone: '210-5555001', email: 'info@techcons.gr' },
    { code: 'CL-002', name: 'Οικοδόμος Α. Παπαδόπουλος', vatNumber: '123789456', type: 'customer', city: 'Πειραιάς', phone: '210-5555002', email: 'papadop@mail.gr' },
    { code: 'CL-003', name: 'Βιομηχανικά Είδη Κ. Νικολάου', vatNumber: '456123789', type: 'supplier', city: 'Θεσσαλονίκη', phone: '2310-111111', email: 'nikolaou@biz.gr' },
    { code: 'CL-004', name: 'Hotel Grand Athens', vatNumber: '789456123', type: 'customer', city: 'Αθήνα', phone: '210-6666001', email: 'procurement@grandathens.gr' },
  ];

  for (const client of clients) {
    await db.client.upsert({
      where: { code_businessId: { code: client.code, businessId: business.id } },
      update: {},
      create: { ...client, businessId: business.id },
    });
  }
  console.log('✅ Clients created');

  // Create sample costs
  const costs = [
    { category: 'rent', description: 'Ενοίκιο Γραφείου Ιανουαρίου', amount: 1200, recurrence: 'monthly', vendor: 'Ιδιοκτήτης Κ. Σταύρος' },
    { category: 'payroll', description: 'Μισθοδοσία Φεβρουαρίου', amount: 3500, recurrence: 'monthly', vendor: '' },
    { category: 'utilities', description: 'Λογαριασμός ΔΕΗ', amount: 280, recurrence: 'monthly', vendor: 'ΔΕΗ' },
    { category: 'marketing', description: 'Google Ads - Ιανουάριος', amount: 450, recurrence: 'monthly', vendor: 'Google' },
    { category: 'operations', description: 'Ασφάλεια Αυτοκινήτου', amount: 650, recurrence: 'yearly', vendor: 'Interamerican' },
  ];

  for (const cost of costs) {
    await db.cost.create({
      data: { ...cost, businessId: business.id, date: new Date() },
    }).catch(() => {});
  }
  console.log('✅ Sample costs created');

  // Create sample invoices
  const cl1 = await db.client.findUnique({ where: { code_businessId: { code: 'CL-001', businessId: business.id } } });
  const cl2 = await db.client.findUnique({ where: { code_businessId: { code: 'CL-002', businessId: business.id } } });

  if (cl1) {
    await db.invoice.create({
      data: {
        number: '2024-0001',
        type: 'SALE',
        status: 'paid',
        clientId: cl1.id,
        businessId: business.id,
        issueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        subtotal: 1000,
        vatAmount: 240,
        total: 1240,
        paidAmount: 1240,
        items: {
          create: [
            { description: 'Καλώδιο NYM 3x2.5 - 100ml', quantity: 100, unitPrice: 1.80, vatRate: 24, vatAmount: 43.2, total: 223.2 },
            { description: 'Ρευματοδότες 16A x30', quantity: 30, unitPrice: 4.20, vatRate: 24, vatAmount: 30.24, total: 156.24 },
          ],
        },
      },
    }).catch(() => {});
  }

  if (cl2) {
    await db.invoice.create({
      data: {
        number: '2024-0002',
        type: 'SALE',
        status: 'sent',
        clientId: cl2.id,
        businessId: business.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: 500,
        vatAmount: 120,
        total: 620,
        items: {
          create: [
            { description: 'Δράπανο Bosch 750W', quantity: 1, unitPrice: 69, vatRate: 24, vatAmount: 16.56, total: 85.56 },
            { description: 'Χρώμα Λευκό 10lt x3', quantity: 3, unitPrice: 35, vatRate: 24, vatAmount: 25.2, total: 130.2 },
          ],
        },
      },
    }).catch(() => {});
  }
  console.log('✅ Sample invoices created');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login Credentials:');
  console.log('Master Admin:', process.env.MASTER_ADMIN_EMAIL || 'admin@myerp.gr', '/', process.env.MASTER_ADMIN_PASSWORD || 'Admin@123456');
  console.log('Business Admin: bizadmin@demo.gr / Admin@123456');
  console.log('Regular User: user@demo.gr / User@123456');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
