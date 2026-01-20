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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { 
  CreateServiceDto, 
  UpdateServiceDto, 
  AssignStudentToServiceDto, 
  AssignMultipleStudentsDto,
  UnassignStudentFromServiceDto,
} from './dto/service.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createService(@TenantId() tenantId: string, @Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.createService(tenantId, createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services with pagination' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  getAllServices(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.servicesService.getAllServices(tenantId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getServiceById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.servicesService.getServiceById(tenantId, params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  updateService(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.updateService(tenantId, params.id, updateServiceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service deleted successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @HttpCode(HttpStatus.OK)
  deleteService(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.servicesService.deleteService(tenantId, params.id);
  }

  @Post(':id/students')
  @ApiOperation({ summary: 'Assign a student to a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 201, description: 'Student assigned successfully' })
  @ApiResponse({ status: 404, description: 'Service or student not found' })
  @ApiResponse({ status: 409, description: 'Student already assigned to this service' })
  assignStudentToService(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() assignStudentDto: AssignStudentToServiceDto,
  ) {
    return this.servicesService.assignStudentToService(tenantId, params.id, assignStudentDto);
  }

  @Post(':id/students/bulk')
  @ApiOperation({ summary: 'Assign multiple students to a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 201, description: 'Students assigned successfully' })
  @ApiResponse({ status: 400, description: 'One or more students not found' })
  @ApiResponse({ status: 409, description: 'All students already assigned' })
  assignMultipleStudents(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() assignMultipleDto: AssignMultipleStudentsDto,
  ) {
    return this.servicesService.assignMultipleStudents(tenantId, params.id, assignMultipleDto);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Unassign a student from a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student unassigned successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @HttpCode(HttpStatus.OK)
  unassignStudentFromService(
    @TenantId() tenantId: string,
    @Param('id') serviceId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.servicesService.unassignStudentFromService(tenantId, serviceId, studentId);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get all students assigned to a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getServiceStudents(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.servicesService.getServiceStudents(tenantId, params.id, paginationDto);
  }

  @Get('students/:studentId/services')
  @ApiOperation({ summary: 'Get all services assigned to a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentServices(
    @TenantId() tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.servicesService.getStudentServices(tenantId, studentId);
  }
}
