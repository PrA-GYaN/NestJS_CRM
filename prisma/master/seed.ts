import { PrismaClient } from '@prisma/master-client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting master database seeding...');

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
        dbPort: parseInt(process.env.TENANT_DB_PORT || '5432'),
        dbName: 'tenant_demo',
        dbUser: process.env.TENANT_DB_USER || 'postgres',
        dbPassword: process.env.TENANT_DB_PASSWORD || 'postgres',
        featurePackage: 'Advanced',
        status: 'Active',
      },
    });
    console.log('✅ Demo Tenant created:', tenant.subdomain);
    console.log('⚠️  Note: You need to create the tenant database and run migrations manually:');
    console.log(`   1. createdb ${tenant.dbName}`);
    console.log(`   2. TENANT_DATABASE_URL="postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}" npm run prisma:migrate:tenant`);
  } else {
    console.log('✅ Demo Tenant already exists');
  }

  console.log('🎉 Master database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
