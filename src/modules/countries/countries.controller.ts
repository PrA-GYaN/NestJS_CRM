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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { CreateCountryDto, UpdateCountryDto } from './dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

@ApiTags('Countries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('countries')
export class CountriesController {
  constructor(private countriesService: CountriesService) {}

  @Post()
  @CanCreate('countries')
  @ApiOperation({ summary: 'Create new country' })
  @ApiResponse({ status: 201, description: 'Country created successfully' })
  @ApiResponse({ status: 409, description: 'Country code already exists' })
  createCountry(@TenantId() tenantId: string, @Body() createCountryDto: CreateCountryDto) {
    return this.countriesService.createCountry(tenantId, createCountryDto);
  }

  @Get()
  @CanRead('countries')
  @ApiOperation({ summary: 'Get all countries with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of countries' })
  getAllCountries(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.countriesService.getAllCountries(tenantId, paginationDto);
  }

  @Get('active')
  @CanRead('countries')
  @ApiOperation({ summary: 'Get all active countries' })
  @ApiResponse({ status: 200, description: 'Returns list of active countries' })
  getActiveCountries(@TenantId() tenantId: string) {
    return this.countriesService.getActiveCountries(tenantId);
  }

  @Get(':id')
  @CanRead('countries')
  @ApiOperation({ summary: 'Get country by ID' })
  @ApiResponse({ status: 200, description: 'Returns country details' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  getCountryById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.countriesService.getCountryById(tenantId, params.id);
  }

  @Get(':id/universities')
  @CanRead('countries')
  @ApiOperation({ summary: 'Get universities by country' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of universities for the country' })
  getCountryUniversities(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.countriesService.getCountryUniversities(tenantId, params.id, paginationDto);
  }

  @Get(':id/visa-types')
  @CanRead('countries')
  @ApiOperation({ summary: 'Get visa types by country' })
  @ApiResponse({ status: 200, description: 'Returns list of visa types for the country' })
  getCountryVisaTypes(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.countriesService.getCountryVisaTypes(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('countries')
  @ApiOperation({ summary: 'Update country' })
  @ApiResponse({ status: 200, description: 'Country updated successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 409, description: 'Country code already exists' })
  updateCountry(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateCountryDto: UpdateCountryDto,
  ) {
    return this.countriesService.updateCountry(tenantId, params.id, updateCountryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete country' })
  @ApiResponse({ status: 200, description: 'Country deleted successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete country with associated data' })
  deleteCountry(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.countriesService.deleteCountry(tenantId, params.id);
  }
}
