import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ 
    summary: 'Get comprehensive dashboard overview',
    description: 'Returns aggregated statistics for leads, students, visas, tasks, appointments, payments, and more'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns comprehensive dashboard data including all key metrics' 
  })
  getDashboardOverview(@TenantId() tenantId: string) {
    return this.dashboardService.getDashboardOverview(tenantId);
  }

  @Get('stats/date-range')
  @ApiOperation({ summary: 'Get statistics for a specific date range' })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Returns statistics for the specified date range' })
  getStatsByDateRange(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getStatsByDateRange(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
