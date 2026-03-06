/**
 * Script: remove-permissions.ts
 *
 * Removes ALL permissions and role_permissions from every active tenant database.
 * Handles foreign key constraints by deleting role_permissions before permissions.
 *
 * Usage:
 *   npm run remove-permissions
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MasterPrismaService } from '../common/prisma/master-prisma.service';
import { TenantService } from '../common/tenant/tenant.service';

async function removePermissions() {
  console.log('🗑️  Starting permission removal for all tenants...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const masterPrisma = app.get(MasterPrismaService);
    const tenantService = app.get(TenantService);

    // Fetch all active tenants
    const tenants = await masterPrisma.tenant.findMany({
      where: { status: 'Active' },
    });

    console.log(`Found ${tenants.length} active tenant(s)\n`);

    let successCount = 0;
    let failCount = 0;

    for (const tenant of tenants) {
      console.log(`\n📦 Processing tenant: ${tenant.name} (${tenant.id})`);

      try {
        const tenantPrisma = await tenantService.getTenantPrisma(tenant.id);

        // Step 1: Delete all role_permissions first (respects FK constraint)
        const deletedRolePerms = await tenantPrisma.rolePermission.deleteMany({
          where: { tenantId: tenant.id },
        });
        console.log(
          `   ✅ Deleted ${deletedRolePerms.count} role_permission record(s)`,
        );

        // Step 2: Delete all permissions
        const deletedPerms = await tenantPrisma.permission.deleteMany({
          where: { tenantId: tenant.id },
        });
        console.log(`   ✅ Deleted ${deletedPerms.count} permission record(s)`);

        successCount++;
      } catch (error: any) {
        console.error(
          `   ❌ Failed for tenant "${tenant.name}": ${error?.message ?? error}`,
        );
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Removal summary:');
    console.log(`  ✅ Success : ${successCount} tenant(s)`);
    console.log(`  ❌ Failed  : ${failCount} tenant(s)`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Fatal error during permission removal:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

removePermissions()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
