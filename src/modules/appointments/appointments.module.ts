// =================================
// COMPREHENSIVE MODULES BARREL FILE
// All remaining modules consolidated
// =================================

// APPOINTMENTS MODULE
import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { TenantModule } from '../../common/tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { WorkingHoursModule } from '../working-hours/working-hours.module';

@Module({
  imports: [TenantModule, NotificationsModule, ActivityLogsModule, WorkingHoursModule],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}

