import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export enum NotificationEntityType {
  Task = 'Task',
  Appointment = 'Appointment',
  Lead = 'Lead',
  Student = 'Student',
  Service = 'Service',
  Other = 'Other',
}

export enum NotificationStatus {
  Sent = 'Sent',
  Read = 'Read',
  Unread = 'Unread',
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: 'uuid-string',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Type of entity that triggered the notification',
    enum: NotificationEntityType,
    example: NotificationEntityType.Task,
  })
  @IsEnum(NotificationEntityType)
  @IsNotEmpty()
  type!: NotificationEntityType;

  @ApiProperty({
    description: 'Notification message',
    example: 'You have been assigned a new task: Complete student application review',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON object',
    example: { taskId: 'uuid', taskTitle: 'Review Application', priority: 'High' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 'uuid-string' })
  id!: string;

  @ApiProperty({ example: 'uuid-string' })
  tenantId!: string;

  @ApiProperty({ example: 'uuid-string' })
  userId!: string;

  @ApiProperty({ enum: NotificationEntityType })
  type!: NotificationEntityType;

  @ApiProperty({ example: 'You have been assigned a new task' })
  message!: string;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiPropertyOptional({ example: { taskId: 'uuid', taskTitle: 'Review Application' } })
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiProperty()
  createdAt!: Date;
}

export class MarkNotificationAsReadDto {
  @ApiProperty({
    description: 'Notification ID to mark as read',
    example: 'uuid-string',
  })
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}
