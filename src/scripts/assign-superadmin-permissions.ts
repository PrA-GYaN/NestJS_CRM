/**
 * Script: assign-superadmin-permissions.ts
 *
 * For every active tenant:
 *   1. Ensures all system permissions exist (upsert – idempotent).
 *   2. Finds the SUPER_ADMIN role.
 *   3. Assigns ALL permissions to SUPER_ADMIN (skipDuplicates – idempotent).
 *
 * Safe to run multiple times: no data will be duplicated.
 *
 * Usage:
 *   npm run assign-superadmin-permissions
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MasterPrismaService } from '../common/prisma/master-prisma.service';
import { TenantService } from '../common/tenant/tenant.service';
import { PermissionsService } from '../common/permissions/permissions.service';

async function assignSuperAdminPermissions() {
  console.log('🔐 Assigning all permissions to SUPER_ADMIN for all tenants...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const masterPrisma = app.get(MasterPrismaService);
    const tenantService = app.get(TenantService);
    const permissionsService = app.get(PermissionsService);

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

        // ── Step 1: Ensure all system permissions are present (idempotent) ──
        const seedResult = await permissionsService.seedPermissions(
          tenantPrisma,
          tenant.id,
        );
        console.log(
          `   ✅ Permissions seeded: ${seedResult.created} created/updated, ${seedResult.existing} already up-to-date`,
        );

        // ── Step 2: Locate the SUPER_ADMIN role ──────────────────────────────
        const superAdminRole = await tenantPrisma.role.findFirst({
          where: { tenantId: tenant.id, name: 'SUPER_ADMIN' },
        });

        if (!superAdminRole) {
          console.warn(
            `   ⚠️  SUPER_ADMIN role not found for tenant "${tenant.name}". Skipping assignment.`,
          );
          failCount++;
          continue;
        }

        // ── Step 3: Fetch all permissions for this tenant ────────────────────
        const allPermissions = await tenantPrisma.permission.findMany({
          where: { tenantId: tenant.id },
          select: { id: true },
        });

        // ── Step 4: Build role_permission rows and upsert (idempotent) ────────
        const rolePermissionData = allPermissions.map((perm) => ({
          tenantId: tenant.id,
          roleId: superAdminRole.id,
          permissionId: perm.id,
        }));

        if (rolePermissionData.length > 0) {
          const result = await tenantPrisma.rolePermission.createMany({
            data: rolePermissionData,
            skipDuplicates: true, // Ensures idempotency
          });

          console.log(
            `   ✅ Assigned ${result.count} new permission(s) to SUPER_ADMIN (${allPermissions.length} total, duplicates skipped)`,
          );
        } else {
          console.log(`   ℹ️  No permissions to assign.`);
        }

        successCount++;
      } catch (error: any) {
        console.error(
          `   ❌ Failed for tenant "${tenant.name}": ${error?.message ?? error}`,
        );
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Assignment summary:');
    console.log(`  ✅ Success : ${successCount} tenant(s)`);
    console.log(`  ❌ Failed  : ${failCount} tenant(s)`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Fatal error during permission assignment:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

assignSuperAdminPermissions()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
