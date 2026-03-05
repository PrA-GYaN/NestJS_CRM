import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/tenant-client';
import { PaginationDto } from '../../../common/dto/common.dto';

export class TaskQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Filter tasks by status',
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Filter tasks by assignedTo user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Filter tasks by related entity type (Student, Lead, etc.)',
  })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @ApiPropertyOptional({
    description: 'Filter tasks by related entity ID',
  })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;
}
