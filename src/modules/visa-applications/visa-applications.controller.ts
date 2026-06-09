import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  Patch,
  Delete,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VisaApplicationsService } from './visa-applications.service';
import {
  CreateVisaApplicationDto,
  AdvanceVisaStepDto,
  DefaultFilterDto,
  UpdateVisaApplicationDto,
} from './dto/visa-application.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

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
  @ApiResponse({
    status: 409,
    description: 'A visa application already exists for this course application',
  })
  async create(@Req() req: any, @Body() createDto: CreateVisaApplicationDto) {
    return this.visaApplicationsService.create(
      req.user?.tenantId || req.headers['x-tenant-id'],
      createDto,
    );
  }

  @Post(':id/advance-step')
  @ApiOperation({ summary: 'Advance the step of an existing Visa Application safely' })
  @ApiResponse({ status: 200, description: 'The step was successfully advanced' })
  @ApiResponse({
    status: 400,
    description: 'Cannot advance an application that is already Approved or Rejected',
  })
  @ApiResponse({ status: 412, description: 'Precondition failed (Missing required documents)' })
  async advanceStep(
    @Req() req: any,
    @Param('id') id: string,
    @Body() advanceDto: AdvanceVisaStepDto,
  ) {
    return this.visaApplicationsService.advanceStep(
      req.user?.tenantId || req.headers['x-tenant-id'],
      id,
      advanceDto,
    );
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @CanUpdate('visa-applications')
  @ApiOperation({ summary: 'Update a Visa Application' })
  @ApiParam({ name: 'id', description: 'Visa application UUID' })
  @ApiResponse({ status: 200, description: 'Visa application updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires visa-applications:update permission',
  })
  @ApiResponse({ status: 404, description: 'Visa application not found' })
  async update(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdateVisaApplicationDto,
  ) {
    return this.visaApplicationsService.update(
      req.user?.tenantId || req.headers['x-tenant-id'],
      id,
      updateDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all Visa Applications with optional filters' })
  @ApiResponse({ status: 200, description: 'Returns an array of Visa Applications' })
  async findAll(@Req() req: any, @Query() filters: DefaultFilterDto) {
    return this.visaApplicationsService.findAll(
      req.user?.tenantId || req.headers['x-tenant-id'],
      filters,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Visa Application with full details' })
  @ApiResponse({
    status: 200,
    description: 'Visa application with documents, workflow status, and requirements',
  })
  @ApiResponse({ status: 404, description: 'Visa application not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.visaApplicationsService.findOne(
      req.user?.tenantId || req.headers['x-tenant-id'],
      id,
    );
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @CanDelete('visa-applications')
  @ApiOperation({ summary: 'Delete a visa application and related records' })
  @ApiParam({ name: 'id', description: 'Visa application UUID' })
  @ApiResponse({ status: 200, description: 'Visa application deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid visa application ID' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires visa-applications:delete permission',
  })
  @ApiResponse({ status: 404, description: 'Visa application not found' })
  @ApiResponse({ status: 500, description: 'Deletion failed' })
  async delete(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.visaApplicationsService.delete(
      req.user?.tenantId || req.headers['x-tenant-id'],
      id,
    );
  }
}
