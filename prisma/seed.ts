import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed Platform Admin
  const hashedPassword = await bcrypt.hash('Admin@123456', 10);
  
  const existingAdmin = await prisma.platformAdmin.findUnique({
    where: { email: 'admin@platform.com' },
  });

  if (existingAdmin) {
    console.log('✅ Platform Admin already exists');
  } else {
    const admin = await prisma.platformAdmin.create({
      data: {
        email: 'admin@platform.com',
        password: hashedPassword,
        name: 'Platform Administrator',
        role: 'SuperAdmin',
      },
    });
    console.log('✅ Platform Admin created:', admin.email);
  }

  // Seed Example Tenant (Optional - for testing)
  const existingTenant = await prisma.tenant.findUnique({
    where: { subdomain: 'demo' },
  });

  if (!existingTenant) {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Education Consultancy',
        subdomain: 'demo',
        dbHost: process.env.TENANT_DB_HOST || 'localhost',
        dbName: 'tenant_demo',
        dbUser: process.env.TENANT_DB_USER || 'postgres',
        dbPassword: process.env.TENANT_DB_PASSWORD || 'postgres',
        featurePackage: 'Advanced',
        status: 'Active',
      },
    });
    console.log('✅ Demo Tenant created:', tenant.subdomain);
  } else {
    console.log('✅ Demo Tenant already exists');
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
