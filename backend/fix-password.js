const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@invofy.com' },
    update: { password: hash },
    create: {
      name: 'Admin',
      email: 'admin@invofy.com',
      password: hash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Done. User:', user.email, '| Password set to: admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
