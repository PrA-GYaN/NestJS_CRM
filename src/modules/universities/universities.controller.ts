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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UniversitiesService } from './universities.service';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete, RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Universities & Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('universities')
export class UniversitiesController {
  constructor(private universitiesService: UniversitiesService) {}

  @Post()
  @CanCreate('universities')
  @ApiOperation({ summary: 'Create university' })
  createUniversity(@TenantId() tenantId: string, @Body() data: any) {
    return this.universitiesService.createUniversity(tenantId, data);
  }

  @Get()
  @CanRead('universities')
  @ApiOperation({ summary: 'Get all universities' })
  getAllUniversities(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.universitiesService.getAllUniversities(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('universities')
  @ApiOperation({ summary: 'Get university by ID' })
  getUniversityById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.universitiesService.getUniversityById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('universities')
  @ApiOperation({ summary: 'Update university' })
  updateUniversity(@TenantId() tenantId: string, @Param() params: IdParamDto, @Body() data: any) {
    return this.universitiesService.updateUniversity(tenantId, params.id, data);
  }

  @Delete(':id')
  @CanDelete('universities')
  @ApiOperation({ summary: 'Delete university' })
  deleteUniversity(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.universitiesService.deleteUniversity(tenantId, params.id);
  }

  @Post(':id/courses')
  @RequirePermissions('universities:manage-courses')
  @ApiOperation({ summary: 'Create course for university' })
  createCourse(@TenantId() tenantId: string, @Param() params: IdParamDto, @Body() data: any) {
    return this.universitiesService.createCourse(tenantId, params.id, data);
  }

  @Get(':id/courses')
  @CanRead('universities')
  @ApiOperation({ summary: 'Get courses by university' })
  getCoursesByUniversity(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.universitiesService.getCoursesByUniversity(tenantId, params.id);
  }
}
