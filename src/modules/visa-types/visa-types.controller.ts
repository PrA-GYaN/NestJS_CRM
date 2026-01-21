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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VisaTypesService } from './visa-types.service';
import { CreateVisaTypeDto, UpdateVisaTypeDto } from './dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

@ApiTags('Visa Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visa-types')
export class VisaTypesController {
  constructor(private visaTypesService: VisaTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create new visa type' })
  @ApiResponse({ status: 201, description: 'Visa type created successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 409, description: 'Visa type already exists for this country' })
  createVisaType(@TenantId() tenantId: string, @Body() createVisaTypeDto: CreateVisaTypeDto) {
    return this.visaTypesService.createVisaType(tenantId, createVisaTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all visa types with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of visa types' })
  getAllVisaTypes(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.visaTypesService.getAllVisaTypes(tenantId, paginationDto);
  }

  @Get('by-country/:countryId')
  @ApiOperation({ summary: 'Get visa types by country' })
  @ApiParam({ name: 'countryId', description: 'Country ID' })
  @ApiResponse({ status: 200, description: 'Returns list of visa types for the country' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  getVisaTypesByCountry(@TenantId() tenantId: string, @Param('countryId') countryId: string) {
    return this.visaTypesService.getVisaTypesByCountry(tenantId, countryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get visa type by ID' })
  @ApiResponse({ status: 200, description: 'Returns visa type details with workflows' })
  @ApiResponse({ status: 404, description: 'Visa type not found' })
  getVisaTypeById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.visaTypesService.getVisaTypeById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('visa-types')
  @ApiOperation({ summary: 'Update visa type' })
  @ApiResponse({ status: 200, description: 'Visa type updated successfully' })
  @ApiResponse({ status: 404, description: 'Visa type or country not found' })
  @ApiResponse({ status: 409, description: 'Visa type name already exists' })
  updateVisaType(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateVisaTypeDto: UpdateVisaTypeDto,
  ) {
    return this.visaTypesService.updateVisaType(tenantId, params.id, updateVisaTypeDto);
  }

  @Delete(':id')
  @CanDelete('visa-types')
  @ApiOperation({ summary: 'Delete visa type' })
  @ApiResponse({ status: 200, description: 'Visa type deleted successfully' })
  @ApiResponse({ status: 404, description: 'Visa type not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete visa type with applications' })
  deleteVisaType(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.visaTypesService.deleteVisaType(tenantId, params.id);
  }
}
