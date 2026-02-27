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
import { BlogsService } from './blogs.service';
import { CreateBlogDto, UpdateBlogDto, PublishBlogDto } from './dto/blog.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete, RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Content Management - Blogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('blogs')
export class BlogsController {
  constructor(private blogsService: BlogsService) {}

  @Post()
  @CanCreate('blogs')
  @ApiOperation({
    summary: 'Create new blog post',
    description: 'Creates a new blog post for the current tenant. Blog starts in Draft status.',
  })
  createBlog(@TenantId() tenantId: string, @Body() createBlogDto: CreateBlogDto) {
    return this.blogsService.createBlog(tenantId, createBlogDto);
  }

  @Get()
  @CanRead('blogs')
  @ApiOperation({
    summary: 'Get all blog posts (tenant-scoped)',
    description: 'Returns all blog posts for the current tenant with pagination and search.',
  })
  getAllBlogs(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.blogsService.getAllBlogs(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('blogs')
  @ApiOperation({
    summary: 'Get blog post by ID',
    description: 'Returns a specific blog post by ID (tenant-scoped).',
  })
  getBlogById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.blogsService.getBlogById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('blogs')
  @ApiOperation({
    summary: 'Update blog post',
    description: 'Updates an existing blog post (tenant-scoped).',
  })
  updateBlog(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateBlogDto: UpdateBlogDto,
  ) {
    return this.blogsService.updateBlog(tenantId, params.id, updateBlogDto);
  }

  @Patch(':id/publish')
  @RequirePermissions('blogs:publish')
  @ApiOperation({
    summary: 'Publish or unpublish blog post',
    description: 'Changes the publication status of a blog post.',
  })
  publishBlog(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() publishDto: PublishBlogDto,
  ) {
    return this.blogsService.publishBlog(tenantId, params.id, publishDto.publish);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete blog post',
    description: 'Permanently deletes a blog post (tenant-scoped).',
  })
  deleteBlog(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.blogsService.deleteBlog(tenantId, params.id);
  }

  @Public()
  @Get('public/slug/:slug')
  @ApiOperation({
    summary: 'Get published blog by slug (Public)',
    description: 'Public endpoint to access published blog posts by slug. Only returns published posts.',
  })
  @ApiParam({ name: 'slug', description: 'Blog post slug' })
  getPublicBlogBySlug(@TenantId() tenantId: string, @Param('slug') slug: string) {
    return this.blogsService.getBlogBySlug(tenantId, slug, true);
  }
}
