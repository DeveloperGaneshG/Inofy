const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@invofy.com' },
    update: { password: adminHash },
    create: {
      name: 'Admin',
      email: 'admin@invofy.com',
      password: adminHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Done. User:', admin.email, '| Password set to: admin123');

  const chanduHash = await bcrypt.hash('Chandu@7957', 10);
  const chandu = await prisma.user.upsert({
    where: { email: 'chandu@invofy.com' },
    update: { password: chanduHash },
    create: {
      name: 'Chandu',
      email: 'chandu@invofy.com',
      password: chanduHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Done. User:', chandu.email, '| Password set to: Chandu@7957');
}

main().catch(console.error).finally(() => prisma.$disconnect());
