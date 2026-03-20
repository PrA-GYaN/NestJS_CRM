import { Controller, Post, Body, Param, Get, Query, Patch, UseGuards, Req } from '@nestjs/common';
import { VisaApplicationsService } from './visa-applications.service';
import { CreateVisaApplicationDto, AdvanceVisaStepDto, DefaultFilterDto } from './dto/visa-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Visa Applications')
@ApiBearerAuth()
@Controller('visa-applications')
export class VisaApplicationsController {
  constructor(private readonly visaApplicationsService: VisaApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Visa Application' })
  @ApiResponse({ status: 201, description: 'The Visa Application has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid payload or missing active workflow' })
  @ApiResponse({ status: 404, description: 'Student or Visa Type not found' })
  @ApiResponse({ status: 409, description: 'A visa application already exists for this course application' })
  async create(
    @Req() req: any,
    @Body() createDto: CreateVisaApplicationDto,
  ) {
    return this.visaApplicationsService.create(req.user?.tenantId || req.headers['x-tenant-id'], createDto);
  }

  @Post(':id/advance-step')
  @ApiOperation({ summary: 'Advance the step of an existing Visa Application safely' })
  @ApiResponse({ status: 200, description: 'The step was successfully advanced' })
  @ApiResponse({ status: 400, description: 'Cannot advance an application that is already Approved or Rejected' })
  @ApiResponse({ status: 409, description: 'Concurrency conflict (step mismatch or concurrent request detected)' })
  @ApiResponse({ status: 412, description: 'Precondition failed (Missing required documents)' })
  async advanceStep(
    @Req() req: any,
    @Param('id') id: string,
    @Body() advanceDto: AdvanceVisaStepDto,
  ) {
    return this.visaApplicationsService.advanceStep(req.user?.tenantId || req.headers['x-tenant-id'], id, advanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all Visa Applications with optional filters' })
  @ApiResponse({ status: 200, description: 'Returns an array of Visa Applications' })
  async findAll(@Req() req: any, @Query() filters: DefaultFilterDto) {
    return this.visaApplicationsService.findAll(req.user?.tenantId || req.headers['x-tenant-id'], filters);
  }
}
