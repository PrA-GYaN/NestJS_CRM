import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, ConvertLeadDto, LeadsQueryDto } from './dto/leads.dto';
import { IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
  RequirePermissions,
} from '../../common/decorators/permissions.decorator';
import { UseScope } from '../../common/decorators/scope.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserScopes } from '../../common/decorators/user-scopes.decorator';

@ApiTags('Lead Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  @CanCreate('leads')
  @ApiOperation({ summary: 'Create new lead' })
  createLead(@TenantId() tenantId: string, @Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.createLead(tenantId, createLeadDto);
  }

  @Get()
  @CanRead('leads')
  @UseScope('leads')
  @ApiOperation({ summary: 'Get all leads with filtering' })
  getAllLeads(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @UserScopes() userScopes: Record<string, string>,
    @Query() queryDto: LeadsQueryDto,
  ) {
    const scope = userScopes['leads'] || userScopes['__all__'] || 'own';
    return this.leadsService.getAllLeads(tenantId, queryDto, user.id, scope);
  }

  @Get(':id')
  @CanRead('leads')
  @UseScope('leads')
  @ApiOperation({ summary: 'Get lead by ID' })
  getLeadById(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @UserScopes() userScopes: Record<string, string>,
    @Param() params: IdParamDto,
  ) {
    const scope = userScopes['leads'] || userScopes['__all__'] || 'own';
    return this.leadsService.getLeadById(tenantId, params.id, user.id, scope);
  }

  @Put(':id')
  @CanUpdate('leads')
  @ApiOperation({ summary: 'Update lead' })
  updateLead(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    return this.leadsService.updateLead(tenantId, params.id, updateLeadDto);
  }

  @Delete(':id')
  @CanDelete('leads')
  @ApiOperation({ summary: 'Delete lead' })
  deleteLead(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.leadsService.deleteLead(tenantId, params.id);
  }

  @Post(':id/convert')
  @RequirePermissions('leads:update', 'students:create')
  @ApiOperation({ summary: 'Convert lead to student' })
  convertToStudent(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() convertDto: ConvertLeadDto,
  ) {
    return this.leadsService.convertToStudent(tenantId, params.id, convertDto);
  }
}
