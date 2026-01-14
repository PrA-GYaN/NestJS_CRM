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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ScholarshipsService } from './scholarships.service';
import { CreateScholarshipDto, UpdateScholarshipDto, PublishScholarshipDto } from './dto/scholarship.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Content Management - Scholarships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scholarships')
export class ScholarshipsController {
  constructor(private scholarshipsService: ScholarshipsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new scholarship',
    description: 'Creates a new scholarship for the current tenant. Scholarship starts in Draft status.',
  })
  createScholarship(@TenantId() tenantId: string, @Body() createScholarshipDto: CreateScholarshipDto) {
    return this.scholarshipsService.createScholarship(tenantId, createScholarshipDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all scholarships (tenant-scoped)',
    description: 'Returns all scholarships for the current tenant with pagination and search.',
  })
  getAllScholarships(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.scholarshipsService.getAllScholarships(tenantId, paginationDto);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active scholarships',
    description: 'Returns published scholarships with deadlines in the future.',
  })
  getActiveScholarships(@TenantId() tenantId: string) {
    return this.scholarshipsService.getActiveScholarships(tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get scholarship by ID',
    description: 'Returns a specific scholarship by ID (tenant-scoped).',
  })
  getScholarshipById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.scholarshipsService.getScholarshipById(tenantId, params.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update scholarship',
    description: 'Updates an existing scholarship (tenant-scoped).',
  })
  updateScholarship(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateScholarshipDto: UpdateScholarshipDto,
  ) {
    return this.scholarshipsService.updateScholarship(tenantId, params.id, updateScholarshipDto);
  }

  @Patch(':id/publish')
  @ApiOperation({
    summary: 'Publish or unpublish scholarship',
    description: 'Changes the publication status of a scholarship.',
  })
  publishScholarship(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() publishDto: PublishScholarshipDto,
  ) {
    return this.scholarshipsService.publishScholarship(tenantId, params.id, publishDto.publish);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete scholarship',
    description: 'Permanently deletes a scholarship (tenant-scoped).',
  })
  deleteScholarship(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.scholarshipsService.deleteScholarship(tenantId, params.id);
  }

  @Public()
  @Get('public/slug/:slug')
  @ApiOperation({
    summary: 'Get published scholarship by slug (Public)',
    description: 'Public endpoint to access published scholarships by slug. Only returns published scholarships.',
  })
  @ApiParam({ name: 'slug', description: 'Scholarship slug' })
  getPublicScholarshipBySlug(@TenantId() tenantId: string, @Param('slug') slug: string) {
    return this.scholarshipsService.getScholarshipBySlug(tenantId, slug, true);
  }
}
