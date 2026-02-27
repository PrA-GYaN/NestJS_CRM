import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Common modules
import { TenantModule } from './common/tenant/tenant.module';
import { PermissionsModule } from './common/permissions/permissions.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform/platform.module';
import { UsersModule } from './modules/users/users.module';
import { LeadsModule } from './modules/leads/leads.module';
import { StudentsModule } from './modules/students/students.module';
import { StudentPanelModule } from './modules/student-panel/student-panel.module';
import { UniversitiesModule } from './modules/universities/universities.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { WorkingHoursModule } from './modules/working-hours/working-hours.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CountriesModule } from './modules/countries/countries.module';
import { VisaTypesModule } from './modules/visa-types/visa-types.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { FilesModule } from './modules/files/files.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ServicesModule } from './modules/services/services.module';

// CMS modules
import { BlogsModule } from './modules/blogs/blogs.module';
import { FaqsModule } from './modules/faqs/faqs.module';
import { LandingPagesModule } from './modules/landing-pages/landing-pages.module';
import { ScholarshipsModule } from './modules/scholarships/scholarships.module';

// Templates & Messaging modules
import { TemplatesModule } from './modules/templates/templates.module';
import { MessagingModule } from './modules/messaging/messaging.module';

// Notifications & Activity Logs modules
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';

// Guards, Filters, Interceptors
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Middleware
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TenantModule,
    PermissionsModule,
    AuthModule,
    PlatformModule,
    UsersModule,
    LeadsModule,
    StudentsModule,
    StudentPanelModule,
    UniversitiesModule,
    AppointmentsModule,
    WorkingHoursModule,
    TasksModule,
    CountriesModule,
    VisaTypesModule,
    WorkflowsModule,
    FilesModule,
    DashboardModule,
    ServicesModule,
    // CMS Modules
    BlogsModule,
    FaqsModule,
    LandingPagesModule,
    ScholarshipsModule,
    // Templates & Messaging
    TemplatesModule,
    MessagingModule,
    // Notifications & Activity Logs
    NotificationsModule,
    ActivityLogsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes except platform admin and auth
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/platform-admin/login', method: RequestMethod.POST },
        { path: 'platform/(.*)', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
