import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { SendEmailDto, SendSmsDto, TriggerEventMessageDto } from './dto/messaging.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanRead, RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Templates & Messaging - Messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Post('send-email')
  @RequirePermissions('messaging:send')
  @ApiOperation({
    summary: 'Send email using tenant template',
    description: 'Sends an email using a template that belongs to the current tenant. Variables are substituted before sending.',
  })
  sendEmail(@TenantId() tenantId: string, @Body() sendEmailDto: SendEmailDto) {
    return this.messagingService.sendEmail(tenantId, sendEmailDto);
  }

  @Post('send-sms')
  @RequirePermissions('messaging:send')
  @ApiOperation({
    summary: 'Send SMS using tenant template',
    description: 'Sends an SMS using a template that belongs to the current tenant. Variables are substituted before sending.',
  })
  sendSms(@TenantId() tenantId: string, @Body() sendSmsDto: SendSmsDto) {
    return this.messagingService.sendSms(tenantId, sendSmsDto);
  }

  @Post('trigger-event')
  @RequirePermissions('messaging:send')
  @ApiOperation({
    summary: 'Trigger messages via event',
    description: 'Triggers email and/or SMS messages based on event type using tenant-specific active templates.',
  })
  triggerEventMessage(@TenantId() tenantId: string, @Body() triggerDto: TriggerEventMessageDto) {
    return this.messagingService.triggerEventMessage(tenantId, triggerDto);
  }

  @Get('logs')
  @CanRead('messaging')
  @ApiOperation({
    summary: 'Get message delivery logs (tenant-scoped)',
    description: 'Returns message delivery logs for the current tenant with pagination.',
  })
  getMessageLogs(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.messagingService.getMessageLogs(tenantId, paginationDto);
  }

  @Get('logs/:id')
  @CanRead('messaging')
  @ApiOperation({
    summary: 'Get message log by ID',
    description: 'Returns a specific message log with full details (tenant-scoped).',
  })
  getMessageLogById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.messagingService.getMessageLogById(tenantId, params.id);
  }
}
