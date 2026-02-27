import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  ActivateTemplateDto,
  PreviewEmailTemplateDto,
} from './dto/email-template.dto';
import {
  CreateSmsTemplateDto,
  UpdateSmsTemplateDto,
  PreviewSmsTemplateDto,
} from './dto/sms-template.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

@ApiTags('Templates & Messaging - Email Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('templates/email')
export class EmailTemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post()
  @CanCreate('templates')
  @ApiOperation({
    summary: 'Create email template (tenant-scoped)',
    description: 'Creates a new email template for the current tenant ONLY. Cannot be shared across tenants.',
  })
  createEmailTemplate(@TenantId() tenantId: string, @Body() createDto: CreateEmailTemplateDto) {
    return this.templatesService.createEmailTemplate(tenantId, createDto);
  }

  @Get()
  @CanRead('templates')
  @ApiOperation({
    summary: 'Get all email templates (tenant-scoped)',
    description: 'Returns email templates for the current tenant ONLY. No cross-tenant visibility.',
  })
  getAllEmailTemplates(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.templatesService.getAllEmailTemplates(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('templates')
  @ApiOperation({
    summary: 'Get email template by ID',
    description: 'Returns a specific email template (tenant-scoped).',
  })
  getEmailTemplateById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.templatesService.getEmailTemplateById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('templates')
  @ApiOperation({
    summary: 'Update email template',
    description: 'Updates an email template (tenant-scoped).',
  })
  updateEmailTemplate(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateDto: UpdateEmailTemplateDto,
  ) {
    return this.templatesService.updateEmailTemplate(tenantId, params.id, updateDto);
  }

  @Patch(':id/activate')
  @ApiOperation({
    summary: 'Activate or deactivate email template',
    description: 'Changes the activation status of an email template.',
  })
  activateEmailTemplate(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() activateDto: ActivateTemplateDto,
  ) {
    return this.templatesService.activateEmailTemplate(tenantId, params.id, activateDto.active);
  }

  @Post(':id/preview')
  @ApiOperation({
    summary: 'Preview email template with sample data',
    description: 'Renders the email template with provided sample data to see the final output.',
  })
  previewEmailTemplate(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() previewDto: PreviewEmailTemplateDto,
  ) {
    return this.templatesService.previewEmailTemplate(tenantId, params.id, previewDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete email template',
    description: 'Permanently deletes an email template (tenant-scoped).',
  })
  deleteEmailTemplate(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.templatesService.deleteEmailTemplate(tenantId, params.id);
  }
}

@ApiTags('Templates & Messaging - SMS Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates/sms')
export class SmsTemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create SMS template (tenant-scoped)',
    description: 'Creates a new SMS template for the current tenant ONLY. Cannot be shared across tenants.',
  })
  createSmsTemplate(@TenantId() tenantId: string, @Body() createDto: CreateSmsTemplateDto) {
    return this.templatesService.createSmsTemplate(tenantId, createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all SMS templates (tenant-scoped)',
    description: 'Returns SMS templates for the current tenant ONLY. No cross-tenant visibility.',
  })
  getAllSmsTemplates(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.templatesService.getAllSmsTemplates(tenantId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get SMS template by ID',
    description: 'Returns a specific SMS template (tenant-scoped).',
  })
  getSmsTemplateById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.templatesService.getSmsTemplateById(tenantId, params.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update SMS template',
    description: 'Updates an SMS template (tenant-scoped).',
  })
  updateSmsTemplate(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateDto: UpdateSmsTemplateDto,
  ) {
    return this.templatesService.updateSmsTemplate(tenantId, params.id, updateDto);
  }

  @Patch(':id/activate')
  @ApiOperation({
    summary: 'Activate or deactivate SMS template',
    description: 'Changes the activation status of an SMS template.',
  })
  activateSmsTemplate(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() activateDto: ActivateTemplateDto,
  ) {
    return this.templatesService.activateSmsTemplate(tenantId, params.id, activateDto.active);
  }

  @Post(':id/preview')
  @ApiOperation({
    summary: 'Preview SMS template with sample data',
    description: 'Renders the SMS template with provided sample data to see the final output.',
  })
  previewSmsTemplate(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() previewDto: PreviewSmsTemplateDto,
  ) {
    return this.templatesService.previewSmsTemplate(tenantId, params.id, previewDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete SMS template',
    description: 'Permanently deletes an SMS template (tenant-scoped).',
  })
  deleteSmsTemplate(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.templatesService.deleteSmsTemplate(tenantId, params.id);
  }
}
