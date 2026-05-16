import { PrismaClient, Role, PurchaseStatus, StockMovementType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── Admin user ────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@invofy.com' },
    update: { password: hashedPassword },
    create: {
      name: 'Admin',
      email: 'admin@invofy.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('Seeded admin user:', admin.email);

  // ── Category ──────────────────────────────────────────────────────────────
  const grocery = await prisma.category.upsert({
    where: { name: 'Grocery' },
    update: {},
    create: { name: 'Grocery', description: 'Daily grocery items' },
  });
  const beverages = await prisma.category.upsert({
    where: { name: 'Beverages' },
    update: {},
    create: { name: 'Beverages', description: 'Drinks and juices' },
  });
  const snacks = await prisma.category.upsert({
    where: { name: 'Snacks' },
    update: {},
    create: { name: 'Snacks', description: 'Chips, biscuits, etc.' },
  });

  // ── Products ──────────────────────────────────────────────────────────────
  const p1 = await prisma.product.upsert({
    where: { sku: 'SKU-RICE-001' },
    update: {},
    create: {
      name: 'Basmati Rice 5kg',
      sku: 'SKU-RICE-001',
      barcode: '8901234567890',
      mrp: 450,
      price: 420,
      costPrice: 350,
      gstRate: 5,       // food grain — 5% GST
      stock: 120,
      lowStockAlert: 20,
      categoryId: grocery.id,
    },
  });
  const p2 = await prisma.product.upsert({
    where: { sku: 'SKU-OIL-002' },
    update: {},
    create: {
      name: 'Sunflower Oil 1L',
      sku: 'SKU-OIL-002',
      barcode: '8901234567891',
      mrp: 160,
      price: 145,
      costPrice: 120,
      gstRate: 5,       // edible oil — 5% GST
      stock: 80,
      lowStockAlert: 15,
      categoryId: grocery.id,
    },
  });
  const p3 = await prisma.product.upsert({
    where: { sku: 'SKU-COLA-003' },
    update: {},
    create: {
      name: 'Cola 2L',
      sku: 'SKU-COLA-003',
      barcode: '8901234567892',
      mrp: 90,
      price: 85,
      costPrice: 65,
      gstRate: 28,      // aerated drinks — 28% GST
      stock: 200,
      lowStockAlert: 30,
      categoryId: beverages.id,
    },
  });
  const p4 = await prisma.product.upsert({
    where: { sku: 'SKU-CHIPS-004' },
    update: {},
    create: {
      name: 'Potato Chips 100g',
      sku: 'SKU-CHIPS-004',
      barcode: '8901234567893',
      mrp: 30,
      price: 28,
      costPrice: 18,
      gstRate: 12,      // branded snacks — 12% GST
      stock: 300,
      lowStockAlert: 50,
      categoryId: snacks.id,
    },
  });
  const p5 = await prisma.product.upsert({
    where: { sku: 'SKU-JUICE-005' },
    update: {},
    create: {
      name: 'Mango Juice 200ml',
      sku: 'SKU-JUICE-005',
      barcode: '8901234567894',
      mrp: 25,
      price: 22,
      costPrice: 14,
      gstRate: 12,      // packaged fruit juice — 12% GST
      stock: 150,
      lowStockAlert: 25,
      categoryId: beverages.id,
    },
  });
  console.log('Seeded products');

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const s1 = await prisma.supplier.upsert({
    where: { email: 'sales@agrofresh.in' },
    update: {},
    create: {
      name: 'AgroFresh Distributors',
      phone: '9876543210',
      email: 'sales@agrofresh.in',
      address: '12, APMC Market, Hyderabad - 500023',
      gstNumber: '36AABCA1234C1ZX',
      isActive: true,
    },
  });
  const s2 = await prisma.supplier.upsert({
    where: { email: 'orders@sunrisebev.com' },
    update: {},
    create: {
      name: 'Sunrise Beverages Pvt Ltd',
      phone: '9123456780',
      email: 'orders@sunrisebev.com',
      address: '5th Floor, Trade Centre, Bangalore - 560001',
      gstNumber: '29AADCS5678D1Z2',
      isActive: true,
    },
  });
  const s3 = await prisma.supplier.upsert({
    where: { email: 'supply@crunchsnacks.in' },
    update: {},
    create: {
      name: 'Crunch Snacks Wholesale',
      phone: '9000012345',
      email: 'supply@crunchsnacks.in',
      address: '88, Industrial Area, Pune - 411018',
      gstNumber: '27AAHCC9012E1ZP',
      isActive: true,
    },
  });
  const s4 = await prisma.supplier.upsert({
    where: { email: 'info@quickmart.co.in' },
    update: {},
    create: {
      name: 'QuickMart Traders',
      phone: '8888877776',
      email: 'info@quickmart.co.in',
      address: '201, Shivaji Nagar, Mumbai - 400001',
      gstNumber: '27AACCQ3456F1ZQ',
      isActive: false,
    },
  });
  console.log('Seeded suppliers');

  // ── Purchases ─────────────────────────────────────────────────────────────
  const existingPO1 = await prisma.purchase.findUnique({ where: { purchaseNumber: 'PO-2025-0001' } });
  if (!existingPO1) {
    await prisma.purchase.create({
      data: {
        purchaseNumber: 'PO-2025-0001',
        supplierId: s1.id,
        userId: admin.id,
        status: PurchaseStatus.RECEIVED,
        notes: 'Monthly grocery stock replenishment',
        totalAmount: 350 * 50 + 120 * 30,
        receivedAt: new Date('2025-03-10'),
        createdAt: new Date('2025-03-08'),
        items: {
          create: [
            {
              productId: p1.id,
              quantity: 50,
              costPrice: 350,
              totalCost: 350 * 50,
              batchNumber: 'BATCH-2025-R01',
              expiryDate: new Date('2026-03-01'),
            },
            {
              productId: p2.id,
              quantity: 30,
              costPrice: 120,
              totalCost: 120 * 30,
              batchNumber: 'BATCH-2025-O01',
            },
          ],
        },
      },
    });
    await prisma.stockMovement.createMany({
      data: [
        { productId: p1.id, type: StockMovementType.PURCHASE, quantity: 50, referenceType: 'purchase', userId: admin.id, note: 'PO-2025-0001' },
        { productId: p2.id, type: StockMovementType.PURCHASE, quantity: 30, referenceType: 'purchase', userId: admin.id, note: 'PO-2025-0001' },
      ],
    });
  }

  const existingPO2 = await prisma.purchase.findUnique({ where: { purchaseNumber: 'PO-2025-0002' } });
  if (!existingPO2) {
    await prisma.purchase.create({
      data: {
        purchaseNumber: 'PO-2025-0002',
        supplierId: s2.id,
        userId: admin.id,
        status: PurchaseStatus.RECEIVED,
        notes: 'Beverage restock for summer season',
        totalAmount: 65 * 100 + 14 * 200,
        receivedAt: new Date('2025-04-02'),
        createdAt: new Date('2025-04-01'),
        items: {
          create: [
            {
              productId: p3.id,
              quantity: 100,
              costPrice: 65,
              totalCost: 65 * 100,
              batchNumber: 'BATCH-2025-C01',
              expiryDate: new Date('2025-12-31'),
            },
            {
              productId: p5.id,
              quantity: 200,
              costPrice: 14,
              totalCost: 14 * 200,
              batchNumber: 'BATCH-2025-J01',
              expiryDate: new Date('2025-10-15'),
            },
          ],
        },
      },
    });
    await prisma.stockMovement.createMany({
      data: [
        { productId: p3.id, type: StockMovementType.PURCHASE, quantity: 100, referenceType: 'purchase', userId: admin.id, note: 'PO-2025-0002' },
        { productId: p5.id, type: StockMovementType.PURCHASE, quantity: 200, referenceType: 'purchase', userId: admin.id, note: 'PO-2025-0002' },
      ],
    });
  }

  const existingPO3 = await prisma.purchase.findUnique({ where: { purchaseNumber: 'PO-2025-0003' } });
  if (!existingPO3) {
    await prisma.purchase.create({
      data: {
        purchaseNumber: 'PO-2025-0003',
        supplierId: s3.id,
        userId: admin.id,
        status: PurchaseStatus.DRAFT,
        notes: 'Pending approval from manager',
        totalAmount: 18 * 500,
        createdAt: new Date('2025-04-20'),
        items: {
          create: [
            {
              productId: p4.id,
              quantity: 500,
              costPrice: 18,
              totalCost: 18 * 500,
              batchNumber: 'BATCH-2025-S01',
              expiryDate: new Date('2026-01-31'),
            },
          ],
        },
      },
    });
  }

  const existingPO4 = await prisma.purchase.findUnique({ where: { purchaseNumber: 'PO-2025-0004' } });
  if (!existingPO4) {
    await prisma.purchase.create({
      data: {
        purchaseNumber: 'PO-2025-0004',
        supplierId: s1.id,
        userId: admin.id,
        status: PurchaseStatus.CANCELLED,
        notes: 'Cancelled due to price dispute',
        totalAmount: 350 * 20,
        createdAt: new Date('2025-04-25'),
        items: {
          create: [
            {
              productId: p1.id,
              quantity: 20,
              costPrice: 350,
              totalCost: 350 * 20,
            },
          ],
        },
      },
    });
  }

  console.log('Seeded purchases');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
