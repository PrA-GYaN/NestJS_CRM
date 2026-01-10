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
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, ConvertLeadDto } from './dto/leads.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Lead Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new lead' })
  createLead(@TenantId() tenantId: string, @Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.createLead(tenantId, createLeadDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leads' })
  getAllLeads(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.leadsService.getAllLeads(tenantId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  getLeadById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.leadsService.getLeadById(tenantId, params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update lead' })
  updateLead(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    return this.leadsService.updateLead(tenantId, params.id, updateLeadDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lead' })
  deleteLead(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.leadsService.deleteLead(tenantId, params.id);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert lead to student' })
  convertToStudent(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() convertDto: ConvertLeadDto,
  ) {
    return this.leadsService.convertToStudent(tenantId, params.id, convertDto);
  }
}
