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
import { LandingPagesService } from './landing-pages.service';
import { CreateLandingPageDto, UpdateLandingPageDto, PublishLandingPageDto } from './dto/landing-page.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete, RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Content Management - Landing Pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('landing-pages')
export class LandingPagesController {
  constructor(private landingPagesService: LandingPagesService) {}

  @Post()
  @CanCreate('landing-pages')
  @ApiOperation({
    summary: 'Create new landing page',
    description: 'Creates a new landing page for the current tenant. Page starts in Draft status.',
  })
  createLandingPage(@TenantId() tenantId: string, @Body() createLandingPageDto: CreateLandingPageDto) {
    return this.landingPagesService.createLandingPage(tenantId, createLandingPageDto);
  }

  @Get()
  @CanRead('landing-pages')
  @ApiOperation({
    summary: 'Get all landing pages (tenant-scoped)',
    description: 'Returns all landing pages for the current tenant with pagination and search.',
  })
  getAllLandingPages(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.landingPagesService.getAllLandingPages(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('landing-pages')
  @ApiOperation({
    summary: 'Get landing page by ID',
    description: 'Returns a specific landing page by ID (tenant-scoped).',
  })
  getLandingPageById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.landingPagesService.getLandingPageById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('landing-pages')
  @ApiOperation({
    summary: 'Update landing page',
    description: 'Updates an existing landing page (tenant-scoped).',
  })
  updateLandingPage(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateLandingPageDto: UpdateLandingPageDto,
  ) {
    return this.landingPagesService.updateLandingPage(tenantId, params.id, updateLandingPageDto);
  }

  @Patch(':id/publish')
  @RequirePermissions('landing-pages:publish')
  @ApiOperation({
    summary: 'Publish or unpublish landing page',
    description: 'Changes the publication status of a landing page.',
  })
  publishLandingPage(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() publishDto: PublishLandingPageDto,
  ) {
    return this.landingPagesService.publishLandingPage(tenantId, params.id, publishDto.publish);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete landing page',
    description: 'Permanently deletes a landing page (tenant-scoped).',
  })
  deleteLandingPage(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.landingPagesService.deleteLandingPage(tenantId, params.id);
  }

  @Public()
  @Get('public/slug/:slug')
  @ApiOperation({
    summary: 'Get published landing page by slug (Public)',
    description: 'Public endpoint to access published landing pages by slug. Only returns published pages.',
  })
  @ApiParam({ name: 'slug', description: 'Landing page slug' })
  getPublicLandingPageBySlug(@TenantId() tenantId: string, @Param('slug') slug: string) {
    return this.landingPagesService.getLandingPageBySlug(tenantId, slug, true);
  }
}
