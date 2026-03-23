import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateVisaDocumentDto, UpdateVisaDocumentDto, VisaDocumentsQueryDto } from './dto';
import { VisaDocumentsService } from './visa-documents.service';

@ApiTags('Visa Documents')
@ApiBearerAuth()
@Controller('visa-documents')
export class VisaDocumentsController {
  constructor(private readonly visaDocumentsService: VisaDocumentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create visa document',
    description:
      'Create a visa document directly with filePath + documentType OR attach an existing student document via studentDocumentId.',
  })
  @ApiResponse({ status: 201, description: 'Visa document created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload or student document mismatch' })
  @ApiResponse({ status: 404, description: 'Visa application or student document not found' })
  create(@TenantId() tenantId: string, @Body() dto: CreateVisaDocumentDto) {
    return this.visaDocumentsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get visa documents' })
  @ApiResponse({ status: 200, description: 'Visa documents retrieved successfully' })
  findAll(@TenantId() tenantId: string, @Query() query: VisaDocumentsQueryDto) {
    return this.visaDocumentsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get visa document by ID' })
  @ApiResponse({ status: 200, description: 'Visa document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Visa document not found' })
  findOne(@TenantId() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.visaDocumentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update visa document',
    description: 'Supports direct updates or re-attaching from studentDocumentId.',
  })
  @ApiResponse({ status: 200, description: 'Visa document updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid update payload' })
  @ApiResponse({ status: 404, description: 'Visa document or related records not found' })
  update(
    @TenantId() tenantId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVisaDocumentDto,
  ) {
    return this.visaDocumentsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete visa document' })
  @ApiResponse({ status: 200, description: 'Visa document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Visa document not found' })
  remove(@TenantId() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.visaDocumentsService.remove(tenantId, id);
  }
}
