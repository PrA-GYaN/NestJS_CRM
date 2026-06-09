import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/tenant-client';
import { IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CreateVisaDocumentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  visaApplicationId!: string;

  @ApiPropertyOptional({
    description: 'Attach an existing student document to this visa application',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  studentDocumentId?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @ValidateIf((dto: CreateVisaDocumentDto) => !dto.studentDocumentId)
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({
    description: 'Path/URL of the file (required when studentDocumentId is not provided)',
  })
  @ValidateIf((dto: CreateVisaDocumentDto) => !dto.studentDocumentId)
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({
    description: 'Workflow ID - which workflow step this document satisfies',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  workflowId?: string;
}

export class UpdateVisaDocumentDto {
  @ApiPropertyOptional({
    description: 'Move document to a different visa application',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  visaApplicationId?: string;

  @ApiPropertyOptional({
    description:
      'Attach/re-attach from an existing student document (overrides documentType/filePath)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  studentDocumentId?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ description: 'New path/URL for file' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({
    description: 'Workflow ID - which workflow step this document satisfies',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  workflowId?: string;
}

export class VisaDocumentsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by visa application ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  visaApplicationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by student ID through visa application relation',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by workflow ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  workflowId?: string;
}
