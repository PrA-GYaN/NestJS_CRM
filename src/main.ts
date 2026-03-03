import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Education Consultancy CRM API')
    
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /auth/tenant/login, /auth/platform-admin/login, or /auth/student/login',
      },
    )
    // Core Auth & Platform
    .addTag('Authentication', 'Login endpoints for platform admins, tenant users, and students. Student tokens include isStudent=true claim.')
    .addTag('Platform Administration', 'Platform admin operations: tenant provisioning, platform user management, and system configuration')
    // Student-facing
    .addTag('Student Panel', 'Self-service portal for students: profile, documents, course applications, appointments, notifications, visa, payments, and services')
    .addTag('Student Management', 'Admin-side student records management: create, update, documents, and lifecycle tracking')
    // Lead & CRM
    .addTag('Lead Management', 'Lead capture, tracking, qualification, and conversion to students')
    // Universities & Courses
    .addTag('Universities & Courses', 'University and course catalog: browse, search, and manage educational institutions')
    // Appointments & Scheduling
    .addTag('Appointments', 'Appointment scheduling, availability management, and booking lifecycle (request → confirm → complete)')
    // Tasks & Workflows
    .addTag('Tasks & Workflows', 'Task assignment, tracking, and automated workflow management')
    // Services
    .addTag('Services', 'Service catalogue management and student service assignments')
    // Users & Roles
    .addTag('Users & Access Control', 'User management, role-based access control (RBAC), and permission assignment')
    // Files
    .addTag('File Management', 'Multi-purpose file upload and download. visaApplicationId and courseId are optional — files can be attached to students, visa applications, courses, or used as general uploads')
    // Notifications
    .addTag('Notifications', 'In-app notification delivery, read status tracking, and notification preferences')
    // Visa
    .addTag('Visa Types', 'Visa type configuration and management for application workflows')
    // Content Management
    .addTag('Content Management - Landing Pages', 'CMS for tenant landing page content and SEO metadata')
    .addTag('Content Management - FAQs', 'CMS for frequently asked questions')
    .addTag('Content Management - Scholarships', 'CMS for scholarship listings and eligibility information')
    .addTag('Content Management - Blogs', 'CMS for blog articles and announcements')
    // Messaging & Templates
    .addTag('Templates & Messaging - Email Templates', 'Email template management with variable substitution support')
    .addTag('Templates & Messaging - SMS Templates', 'SMS template management')
    // Other
    .addTag('Dashboard', 'Aggregated analytics and KPI dashboard data for tenant admins')
    .addTag('Countries', 'Country reference data for forms and filtering')
    .addTag('Workflows', 'Automated workflow definitions, triggers, and execution history')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`💚 Health check available at: http://localhost:${port}/health`);
}

bootstrap();
