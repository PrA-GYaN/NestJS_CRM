import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export enum TemplateStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum MessageEventType {
  LeadCreated = 'LeadCreated',
  LeadAssigned = 'LeadAssigned',
  LeadConverted = 'LeadConverted',
  StudentCreated = 'StudentCreated',
  AppointmentScheduled = 'AppointmentScheduled',
  AppointmentReminder = 'AppointmentReminder',
  TaskAssigned = 'TaskAssigned',
  TaskDueReminder = 'TaskDueReminder',
  VisaWorkflowStepChanged = 'VisaWorkflowStepChanged',
  DocumentRequested = 'DocumentRequested',
  DocumentUploaded = 'DocumentUploaded',
  PaymentReceived = 'PaymentReceived',
  PaymentDue = 'PaymentDue',
  PasswordReset = 'PasswordReset',
  WelcomeEmail = 'WelcomeEmail',
  Custom = 'Custom',
}

export class CreateEmailTemplateDto {
  @ApiProperty({
    description: 'Template name (must be unique per tenant)',
    example: 'Welcome Email Template',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Email subject line',
    example: 'Welcome to {{tenantName}}!',
  })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({
    description: 'Email body (HTML or plain text with variables)',
    example: 'Hello {{studentName}}, welcome to our platform!',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({
    description: 'Available variables/placeholders',
    type: [String],
    example: ['tenantName', 'studentName', 'appointmentDate'],
  })
  @IsArray()
  @IsOptional()
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Event type this template is associated with',
    enum: MessageEventType,
  })
  @IsEnum(MessageEventType)
  @IsOptional()
  eventType?: MessageEventType;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateEmailTemplateDto extends PartialType(CreateEmailTemplateDto) {}

export class ActivateTemplateDto {
  @ApiProperty({
    description: 'Set to true to activate, false to deactivate',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  active!: boolean;
}

export class PreviewEmailTemplateDto {
  @ApiProperty({
    description: 'Sample data for template variables',
    example: {
      tenantName: 'ABC Education Consultancy',
      studentName: 'John Doe',
      appointmentDate: '2026-01-20 10:00 AM',
    },
  })
  @IsNotEmpty()
  sampleData!: Record<string, any>;
}
