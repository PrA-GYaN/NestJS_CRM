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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FaqsService } from './faqs.service';
import { CreateFaqDto, UpdateFaqDto, ReorderFaqDto } from './dto/faq.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

@ApiTags('Content Management - FAQs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('faqs')
export class FaqsController {
  constructor(private faqsService: FaqsService) {}

  @Post()
  @CanCreate('faqs')
  @ApiOperation({
    summary: 'Create new FAQ',
    description: 'Creates a new FAQ for the current tenant.',
  })
  createFaq(@TenantId() tenantId: string, @Body() createFaqDto: CreateFaqDto) {
    return this.faqsService.createFaq(tenantId, createFaqDto);
  }

  @Get()
  @CanRead('faqs')
  @ApiOperation({
    summary: 'Get all FAQs (tenant-scoped)',
    description: 'Returns all FAQs for the current tenant with pagination and search.',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  getAllFaqs(
    @TenantId() tenantId: string,
    @Query() paginationDto: PaginationDto,
    @Query('category') category?: string,
  ) {
    return this.faqsService.getAllFaqs(tenantId, paginationDto, category);
  }

  @Get('grouped')
  @CanRead('faqs')
  @ApiOperation({
    summary: 'Get FAQs grouped by category',
    description: 'Returns active FAQs grouped by their categories.',
  })
  getFaqsByCategory(@TenantId() tenantId: string) {
    return this.faqsService.getFaqsByCategory(tenantId);
  }

  @Get(':id')
  @CanRead('faqs')
  @ApiOperation({
    summary: 'Get FAQ by ID',
    description: 'Returns a specific FAQ by ID (tenant-scoped).',
  })
  getFaqById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.faqsService.getFaqById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('faqs')
  @ApiOperation({
    summary: 'Update FAQ',
    description: 'Updates an existing FAQ (tenant-scoped).',
  })
  updateFaq(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateFaqDto: UpdateFaqDto,
  ) {
    return this.faqsService.updateFaq(tenantId, params.id, updateFaqDto);
  }

  @Patch(':id/reorder')
  @ApiOperation({
    summary: 'Reorder FAQ',
    description: 'Changes the sort order of an FAQ.',
  })
  reorderFaq(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() reorderDto: ReorderFaqDto,
  ) {
    return this.faqsService.reorderFaq(tenantId, params.id, reorderDto.sortOrder);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete FAQ',
    description: 'Permanently deletes an FAQ (tenant-scoped).',
  })
  deleteFaq(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.faqsService.deleteFaq(tenantId, params.id);
  }
}
