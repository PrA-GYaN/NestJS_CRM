import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MasterPrismaService } from '../common/prisma/master-prisma.service';
import { TenantService } from '../common/tenant/tenant.service';
import { PermissionsService } from '../common/permissions/permissions.service';

async function seedPermissionsForAllTenants() {
  console.log('🌱 Starting permission seeding for all tenants...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const masterPrisma = app.get(MasterPrismaService);
    const tenantService = app.get(TenantService);
    const permissionsService = app.get(PermissionsService);

    // Fetch all active tenants
    const tenants = await masterPrisma.tenant.findMany({
      where: { status: 'Active' },
    });

    console.log(`Found ${tenants.length} active tenants\n`);

    let successCount = 0;
    let failCount = 0;

    for (const tenant of tenants) {
      try {
        console.log(`\n📦 Processing tenant: ${tenant.name} (${tenant.id})`);
        
        // Get tenant Prisma client
        const tenantPrisma = await tenantService.getTenantPrisma(tenant.id);

        // Seed permissions
        const permResult = await permissionsService.seedPermissions(
          tenantPrisma,
          tenant.id,
        );
        console.log(
          `   ✅ Permissions: ${permResult.created} created/updated, ${permResult.existing} skipped`,
        );

        // Seed default roles
        await permissionsService.seedDefaultRoles(tenantPrisma, tenant.id);
        console.log(`   ✅ Default roles seeded`);

        successCount++;
      } catch (error: any) {
        console.error(`   ❌ Failed to seed tenant ${tenant.name}:`, error?.message || error);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Seeding completed!`);
    console.log(`   Success: ${successCount} tenants`);
    console.log(`   Failed: ${failCount} tenants`);
    console.log('\n' + '='.repeat(60));
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

seedPermissionsForAllTenants()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
