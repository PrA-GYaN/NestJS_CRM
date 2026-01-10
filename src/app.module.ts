import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Common modules
import { TenantModule } from './common/tenant/tenant.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform/platform.module';
import { UsersModule } from './modules/users/users.module';
import { LeadsModule } from './modules/leads/leads.module';
import { StudentsModule } from './modules/students/students.module';
import { UniversitiesModule } from './modules/universities/universities.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { TasksModule } from './modules/tasks/tasks.module';

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
    AuthModule,
    PlatformModule,
    UsersModule,
    LeadsModule,
    StudentsModule,
    UniversitiesModule,
    AppointmentsModule,
    TasksModule,
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
