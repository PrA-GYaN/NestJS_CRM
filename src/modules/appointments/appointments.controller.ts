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
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create appointment' })
  createAppointment(@TenantId() tenantId: string, @Body() data: any) {
    return this.appointmentsService.createAppointment(tenantId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all appointments' })
  getAllAppointments(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.appointmentsService.getAllAppointments(tenantId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  getAppointmentById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.appointmentsService.getAppointmentById(tenantId, params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update appointment' })
  updateAppointment(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() data: any,
  ) {
    return this.appointmentsService.updateAppointment(tenantId, params.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete appointment' })
  deleteAppointment(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.appointmentsService.deleteAppointment(tenantId, params.id);
  }
}
