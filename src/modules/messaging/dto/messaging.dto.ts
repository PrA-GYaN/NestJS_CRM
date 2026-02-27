import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsObject,
} from 'class-validator';
import { MessageEventType } from '@prisma/tenant-client';

export class SendEmailDto {
  @ApiProperty({ description: 'Email template ID (must belong to current tenant)' })
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  @IsNotEmpty()
  recipientEmail!: string;

  @ApiProperty({
    description: 'Variables to substitute in template',
    example: {
      studentName: 'John Doe',
      appointmentDate: '2026-01-20',
      tenantName: 'ABC Education',
    },
  })
  @IsObject()
  @IsNotEmpty()
  variables!: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Event type that triggered this message',
    enum: MessageEventType,
  })
  @IsEnum(MessageEventType)
  @IsOptional()
  eventType?: MessageEventType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SendSmsDto {
  @ApiProperty({ description: 'SMS template ID (must belong to current tenant)' })
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @ApiProperty({ description: 'Recipient phone number' })
  @IsString()
  @IsNotEmpty()
  recipientPhone!: string;

  @ApiProperty({
    description: 'Variables to substitute in template',
    example: {
      studentName: 'John Doe',
      appointmentDate: '2026-01-20',
    },
  })
  @IsObject()
  @IsNotEmpty()
  variables!: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Event type that triggered this message',
    enum: MessageEventType,
  })
  @IsEnum(MessageEventType)
  @IsOptional()
  eventType?: MessageEventType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class TriggerEventMessageDto {
  @ApiProperty({
    description: 'Event type to trigger',
    enum: MessageEventType,
  })
  @IsEnum(MessageEventType)
  @IsNotEmpty()
  eventType!: MessageEventType;

  @ApiProperty({
    description: 'Recipient email (for email messages)',
  })
  @IsEmail()
  @IsOptional()
  recipientEmail?: string;

  @ApiProperty({
    description: 'Recipient phone (for SMS messages)',
  })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiProperty({
    description: 'Variables to substitute in templates',
    example: {
      studentName: 'John Doe',
      leadName: 'Jane Smith',
      appointmentDate: '2026-01-20',
    },
  })
  @IsObject()
  @IsNotEmpty()
  variables!: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export enum MessageStatus {
  Pending = 'Pending',
  Sent = 'Sent',
  Failed = 'Failed',
  Delivered = 'Delivered',
}
