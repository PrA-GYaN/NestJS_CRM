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
    .setDescription('Multi-tenant CRM API for Education Consultancy Management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Platform Administration', 'Platform admin and tenant management')
    .addTag('Users & Access Control', 'User and role management')
    .addTag('Lead Management', 'Lead tracking and conversion')
    .addTag('Student Management', 'Student information and documents')
    .addTag('Universities & Courses', 'University and course catalog')
    .addTag('Appointments', 'Appointment scheduling')
    .addTag('Tasks & Workflows', 'Task management')
    .addTag('Services', 'Service management and student assignments')
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
