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
import { AppointmentsService } from './appointments.service';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @CanCreate('appointments')
  @ApiOperation({ summary: 'Create appointment' })
  createAppointment(@TenantId() tenantId: string, @Body() data: any) {
    return this.appointmentsService.createAppointment(tenantId, data);
  }

  @Get()
  @CanRead('appointments')
  @ApiOperation({ summary: 'Get all appointments' })
  getAllAppointments(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.appointmentsService.getAllAppointments(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('appointments')
  @ApiOperation({ summary: 'Get appointment by ID' })
  getAppointmentById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.appointmentsService.getAppointmentById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('appointments')
  @ApiOperation({ summary: 'Update appointment' })
  updateAppointment(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() data: any,
  ) {
    return this.appointmentsService.updateAppointment(tenantId, params.id, data);
  }

  @Delete(':id')
  @CanDelete('appointments')
  @ApiOperation({ summary: 'Delete appointment' })
  deleteAppointment(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.appointmentsService.deleteAppointment(tenantId, params.id);
  }
}
