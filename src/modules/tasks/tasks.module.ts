// ================================
// TASKS MODULE
// ================================
import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TenantModule } from '../../common/tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [TenantModule, NotificationsModule, ActivityLogsModule],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}

// ================================
// VISA MODULE
// ================================
@Module({
  providers: [],
  controllers: [],
})
export class VisaModule {}

// ================================
// SERVICES MODULE
// ================================
@Module({
  providers: [],
  controllers: [],
})
export class ServicesModule {}

// ================================
// CONTENT MODULE
// ================================
@Module({
  providers: [],
  controllers: [],
})
export class ContentModule {}

// ================================
// PAYMENTS MODULE
// ================================
@Module({
  providers: [],
  controllers: [],
})
export class PaymentsModule {}

// ================================
// AUDIT MODULE
// ================================
@Module({
  providers: [],
  controllers: [],
})
export class AuditModule {}

// ================================
// CLASSES MODULE
// ================================
@Module({
  providers: [],
  controllers: [],
})
export class ClassesModule {}
