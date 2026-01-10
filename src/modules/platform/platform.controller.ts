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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { CreateTenantDto, UpdateTenantDto, CreatePlatformAdminDto } from './dto/platform.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Platform Administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('platform')
export class PlatformController {
  constructor(private platformService: PlatformService) {}

  @Post('tenants')
  @ApiOperation({ summary: 'Create new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  createTenant(@Body() createTenantDto: CreateTenantDto) {
    return this.platformService.createTenant(createTenantDto);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Get all tenants' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  getAllTenants(@Query() paginationDto: PaginationDto) {
    return this.platformService.getAllTenants(paginationDto);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  getTenantById(@Param() params: IdParamDto) {
    return this.platformService.getTenantById(params.id);
  }

  @Put('tenants/:id')
  @ApiOperation({ summary: 'Update tenant' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  updateTenant(@Param() params: IdParamDto, @Body() updateTenantDto: UpdateTenantDto) {
    return this.platformService.updateTenant(params.id, updateTenantDto);
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Delete tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  deleteTenant(@Param() params: IdParamDto) {
    return this.platformService.deleteTenant(params.id);
  }

  @Post('admins')
  @ApiOperation({ summary: 'Create platform admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  createPlatformAdmin(@Body() createAdminDto: CreatePlatformAdminDto) {
    return this.platformService.createPlatformAdmin(createAdminDto);
  }
}
