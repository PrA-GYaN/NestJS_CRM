// ================================
// TASKS MODULE
// ================================
import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
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
// NOTIFICATIONS MODULE
// ================================
@Module({
  providers: [],
  controllers: [],
})
export class NotificationsModule {}

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
