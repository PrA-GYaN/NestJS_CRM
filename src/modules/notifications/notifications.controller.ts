import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationResponseDto } from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: [NotificationResponseDto],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getUserNotifications(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const tenantId = req.tenantId;
    const userId = req.user.id;

    return this.notificationsService.getUserNotifications(
      tenantId,
      userId,
      paginationDto,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  async getUnreadCount(@Req() req: any) {
    const tenantId = req.tenantId;
    const userId = req.user.id;

    return this.notificationsService.getUnreadCount(tenantId, userId);
  }

  @Get('stream')
  @ApiOperation({
    summary: 'SSE endpoint for real-time notifications',
    description:
      'Server-Sent Events stream that delivers notifications in real-time. Keep this connection open to receive notifications as they happen.',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established',
  })
  async streamNotifications(@Req() req: any, @Res() res: Response) {
    const tenantId = req.tenantId;
    const userId = req.user.id;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

    // Keep-alive ping every 30 seconds
    const keepAliveInterval = setInterval(() => {
      res.write(`:ping\n\n`);
    }, 30000);

    // Subscribe to notification stream
    const subscription = this.notificationsService
      .getNotificationStream()
      .subscribe({
        next: (event) => {
          // Only send notifications for this tenant and user
          if (event.tenantId === tenantId && event.userId === userId) {
            res.write(`data: ${JSON.stringify(event.data)}\n\n`);
          }
        },
        error: (error) => {
          console.error('SSE stream error:', error);
          res.end();
        },
      });

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(keepAliveInterval);
      subscription.unsubscribe();
      res.end();
    });
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    const userId = req.user.id;

    return this.notificationsService.markAsRead(tenantId, id, userId);
  }

  @Put('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number', example: 10 },
      },
    },
  })
  async markAllAsRead(@Req() req: any) {
    const tenantId = req.tenantId;
    const userId = req.user.id;

    return this.notificationsService.markAllAsRead(tenantId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Notification deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    const userId = req.user.id;

    return this.notificationsService.deleteNotification(tenantId, id, userId);
  }
}
