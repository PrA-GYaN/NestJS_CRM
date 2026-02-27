import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { MessageEventType, TemplateStatus } from './email-template.dto';

export class CreateSmsTemplateDto {
  @ApiProperty({
    description: 'Template name (must be unique per tenant)',
    example: 'Appointment Reminder SMS',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'SMS body text with variables',
    example: 'Hi {{studentName}}, reminder: Your appointment is on {{appointmentDate}}.',
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

export class UpdateSmsTemplateDto extends PartialType(CreateSmsTemplateDto) {}

export class PreviewSmsTemplateDto {
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

export { TemplateStatus, MessageEventType };
