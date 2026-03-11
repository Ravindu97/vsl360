import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@vsl360.com' },
    update: {},
    create: {
      email: 'admin@vsl360.com',
      password: passwordHash,
      name: 'System Admin',
      role: Role.OPS_MANAGER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'sales@vsl360.com' },
    update: {},
    create: {
      email: 'sales@vsl360.com',
      password: passwordHash,
      name: 'Sales Person',
      role: Role.SALES,
    },
  });

  await prisma.user.upsert({
    where: { email: 'reservation@vsl360.com' },
    update: {},
    create: {
      email: 'reservation@vsl360.com',
      password: passwordHash,
      name: 'Reservation Team',
      role: Role.RESERVATION,
    },
  });

  await prisma.user.upsert({
    where: { email: 'transport@vsl360.com' },
    update: {},
    create: {
      email: 'transport@vsl360.com',
      password: passwordHash,
      name: 'Transport Team',
      role: Role.TRANSPORT,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
