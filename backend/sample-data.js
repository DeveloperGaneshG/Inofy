const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample data...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const cashierHash = await bcrypt.hash('cashier123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@invofy.com' },
    update: { password: adminHash },
    create: { name: 'Admin', email: 'admin@invofy.com', password: adminHash, role: 'ADMIN', isActive: true },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@invofy.com' },
    update: {},
    create: { name: 'Ravi Kumar', email: 'cashier@invofy.com', password: cashierHash, role: 'CASHIER', isActive: true },
  });

  console.log('✓ Users created');

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Beverages' }, update: {}, create: { name: 'Beverages', description: 'Drinks and beverages' } }),
    prisma.category.upsert({ where: { name: 'Snacks' }, update: {}, create: { name: 'Snacks', description: 'Chips, biscuits and snacks' } }),
    prisma.category.upsert({ where: { name: 'Dairy' }, update: {}, create: { name: 'Dairy', description: 'Milk, curd, paneer and dairy products' } }),
    prisma.category.upsert({ where: { name: 'Staples' }, update: {}, create: { name: 'Staples', description: 'Rice, dal, flour and staples' } }),
    prisma.category.upsert({ where: { name: 'Personal Care' }, update: {}, create: { name: 'Personal Care', description: 'Soap, shampoo and personal care' } }),
  ]);

  const [beverages, snacks, dairy, staples, personalCare] = categories;
  console.log('✓ Categories created');

  // ── Products ───────────────────────────────────────────────────────────────
  const productData = [
    { name: 'Coca Cola 500ml', sku: 'BEV001', barcode: '8901234560001', price: 40, costPrice: 28, stock: 120, lowStockAlert: 20, categoryId: beverages.id },
    { name: 'Pepsi 500ml',     sku: 'BEV002', barcode: '8901234560002', price: 40, costPrice: 27, stock: 100, lowStockAlert: 20, categoryId: beverages.id },
    { name: 'Sprite 500ml',    sku: 'BEV003', barcode: '8901234560003', price: 40, costPrice: 27, stock: 90,  lowStockAlert: 20, categoryId: beverages.id },
    { name: 'Mineral Water 1L',sku: 'BEV004', barcode: '8901234560004', price: 20, costPrice: 10, stock: 200, lowStockAlert: 30, categoryId: beverages.id },
    { name: "Lay's Classic",   sku: 'SNK001', barcode: '8901234560005', price: 20, costPrice: 13, stock: 80,  lowStockAlert: 15, categoryId: snacks.id },
    { name: "Kurkure Masala",  sku: 'SNK002', barcode: '8901234560006', price: 20, costPrice: 13, stock: 75,  lowStockAlert: 15, categoryId: snacks.id },
    { name: 'Parle-G 200g',    sku: 'SNK003', barcode: '8901234560007', price: 25, costPrice: 17, stock: 60,  lowStockAlert: 10, categoryId: snacks.id },
    { name: 'Britannia Bourbon',sku: 'SNK004', barcode: '8901234560008', price: 30, costPrice: 20, stock: 50,  lowStockAlert: 10, categoryId: snacks.id },
    { name: 'Amul Milk 500ml', sku: 'DAI001', barcode: '8901234560009', price: 28, costPrice: 22, stock: 50,  lowStockAlert: 10, categoryId: dairy.id },
    { name: 'Amul Butter 100g',sku: 'DAI002', barcode: '8901234560010', price: 55, costPrice: 44, stock: 40,  lowStockAlert: 8,  categoryId: dairy.id },
    { name: 'Basmati Rice 1kg',sku: 'STA001', barcode: '8901234560011', price: 120, costPrice: 90, stock: 30, lowStockAlert: 5,  categoryId: staples.id },
    { name: 'Toor Dal 500g',   sku: 'STA002', barcode: '8901234560012', price: 80,  costPrice: 62, stock: 8,  lowStockAlert: 10, categoryId: staples.id },
    { name: 'Dettol Soap',     sku: 'PC001',  barcode: '8901234560013', price: 45,  costPrice: 32, stock: 60, lowStockAlert: 10, categoryId: personalCare.id },
    { name: 'Colgate 100g',    sku: 'PC002',  barcode: '8901234560014', price: 65,  costPrice: 48, stock: 45, lowStockAlert: 10, categoryId: personalCare.id },
  ];

  const products = [];
  for (const p of productData) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, price: p.price.toString(), costPrice: p.costPrice.toString() },
    });
    products.push(prod);
  }
  console.log('✓ Products created');

  // ── Customers ──────────────────────────────────────────────────────────────
  const customerData = [
    { name: 'Ramesh Sharma',  phone: '9876543210', email: 'ramesh@gmail.com',  address: '12 MG Road, Bangalore', loyaltyPoints: 150 },
    { name: 'Priya Patel',    phone: '9845012345', email: 'priya@gmail.com',   address: '45 Koramangala, Bangalore', loyaltyPoints: 80 },
    { name: 'Suresh Reddy',   phone: '9731234567', email: 'suresh@gmail.com',  address: '78 Indiranagar, Bangalore', loyaltyPoints: 200 },
    { name: 'Anita Singh',    phone: '9900123456', email: 'anita@gmail.com',   address: '23 HSR Layout, Bangalore', loyaltyPoints: 50 },
    { name: 'Vikram Nair',    phone: '9811234567', email: null,                address: null, loyaltyPoints: 0 },
  ];

  const customers = [];
  for (const c of customerData) {
    const cust = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    });
    customers.push(cust);
  }
  console.log('✓ Customers created');

  // ── Bills ──────────────────────────────────────────────────────────────────
  const billsData = [
    {
      billNumber: 'INV-2026-001', customerId: customers[0].id, userId: admin.id,
      subtotal: 140, taxAmount: 7, discountAmount: 0, totalAmount: 147,
      paymentMethod: 'CASH', status: 'PAID',
      createdAt: new Date('2026-05-01T10:30:00Z'),
      items: [
        { productId: products[0].id, quantity: 2, unitPrice: 40, totalPrice: 80 },
        { productId: products[4].id, quantity: 3, unitPrice: 20, totalPrice: 60 },
      ],
    },
    {
      billNumber: 'INV-2026-002', customerId: customers[1].id, userId: cashier.id,
      subtotal: 223, taxAmount: 11, discountAmount: 10, totalAmount: 224,
      paymentMethod: 'UPI', status: 'PAID',
      createdAt: new Date('2026-05-01T14:15:00Z'),
      items: [
        { productId: products[8].id,  quantity: 2, unitPrice: 28,  totalPrice: 56  },
        { productId: products[9].id,  quantity: 1, unitPrice: 55,  totalPrice: 55  },
        { productId: products[10].id, quantity: 1, unitPrice: 120, totalPrice: 120 },
      ],
    },
    {
      billNumber: 'INV-2026-003', customerId: customers[2].id, userId: cashier.id,
      subtotal: 175, taxAmount: 9, discountAmount: 5, totalAmount: 179,
      paymentMethod: 'CARD', status: 'PAID',
      createdAt: new Date('2026-05-02T09:00:00Z'),
      items: [
        { productId: products[1].id, quantity: 2, unitPrice: 40, totalPrice: 80 },
        { productId: products[5].id, quantity: 3, unitPrice: 20, totalPrice: 60 },
        { productId: products[6].id, quantity: 1, unitPrice: 25, totalPrice: 25 },
        { productId: products[3].id, quantity: 1, unitPrice: 20, totalPrice: 20 },
      ],
    },
    {
      billNumber: 'INV-2026-004', customerId: customers[3].id, userId: admin.id,
      subtotal: 110, taxAmount: 6, discountAmount: 0, totalAmount: 116,
      paymentMethod: 'CASH', status: 'PAID',
      createdAt: new Date('2026-05-02T16:45:00Z'),
      items: [
        { productId: products[12].id, quantity: 1, unitPrice: 45, totalPrice: 45 },
        { productId: products[13].id, quantity: 1, unitPrice: 65, totalPrice: 65 },
      ],
    },
    {
      billNumber: 'INV-2026-005', customerId: customers[4].id, userId: cashier.id,
      subtotal: 200, taxAmount: 10, discountAmount: 20, totalAmount: 190,
      paymentMethod: 'UPI', status: 'PAID',
      createdAt: new Date('2026-05-03T11:20:00Z'),
      items: [
        { productId: products[2].id,  quantity: 2, unitPrice: 40,  totalPrice: 80  },
        { productId: products[11].id, quantity: 1, unitPrice: 80,  totalPrice: 80  },
        { productId: products[7].id,  quantity: 1, unitPrice: 30,  totalPrice: 30  },
        { productId: products[3].id,  quantity: 1, unitPrice: 20,  totalPrice: 20  },
      ],
    },
    {
      billNumber: 'INV-2026-006', customerId: customers[0].id, userId: admin.id,
      subtotal: 95, taxAmount: 5, discountAmount: 0, totalAmount: 100,
      paymentMethod: 'CASH', status: 'PAID',
      createdAt: new Date('2026-05-04T13:10:00Z'),
      items: [
        { productId: products[0].id, quantity: 1, unitPrice: 40, totalPrice: 40 },
        { productId: products[4].id, quantity: 1, unitPrice: 20, totalPrice: 20 },
        { productId: products[6].id, quantity: 1, unitPrice: 25, totalPrice: 25 },
        { productId: products[3].id, quantity: 1, unitPrice: 20, totalPrice: 20 },
      ],
    },
  ];

  for (const bill of billsData) {
    const { items, ...billFields } = bill;
    await prisma.bill.upsert({
      where: { billNumber: bill.billNumber },
      update: {},
      create: {
        ...billFields,
        subtotal: billFields.subtotal.toString(),
        taxAmount: billFields.taxAmount.toString(),
        discountAmount: billFields.discountAmount.toString(),
        totalAmount: billFields.totalAmount.toString(),
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice.toString(),
            totalPrice: i.totalPrice.toString(),
          })),
        },
      },
    });
  }
  console.log('✓ Bills and bill items created');

  console.log('\n✅ Sample data loaded successfully!');
  console.log('─────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Admin   → admin@invofy.com   / admin123');
  console.log('  Cashier → cashier@invofy.com / cashier123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
