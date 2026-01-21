/**
 * Example Controller: Demonstrates how to use the permissions system
 * 
 * This file shows various ways to protect your endpoints with permissions
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  RequirePermissions,
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
  CanExport,
} from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('example')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Apply guards to entire controller
export class ExampleController {

  /**
   * Example 1: Using @RequirePermissions decorator
   * User must have 'leads:read' permission
   */
  @Get('leads')
  @RequirePermissions('leads:read')
  async getLeads() {
    return { message: 'Leads list (requires leads:read permission)' };
  }

  /**
   * Example 2: Using convenience decorators
   * User must have 'students:create' permission
   */
  @Post('students')
  @CanCreate('students')
  async createStudent(@Body() data: any) {
    return { message: 'Student created (requires students:create permission)' };
  }

  /**
   * Example 3: Multiple permissions required
   * User must have BOTH 'leads:update' AND 'leads:assign' permissions
   */
  @Put('leads/:id/assign')
  @RequirePermissions('leads:update', 'leads:assign')
  async assignLead(@Param('id') id: string, @Body() data: any) {
    return { 
      message: 'Lead assigned (requires both leads:update and leads:assign)' 
    };
  }

  /**
   * Example 4: Read operation
   * User must have 'students:read' permission
   */
  @Get('students/:id')
  @CanRead('students')
  async getStudent(@Param('id') id: string) {
    return { message: `Student ${id} (requires students:read permission)` };
  }

  /**
   * Example 5: Update operation
   * User must have 'students:update' permission
   */
  @Put('students/:id')
  @CanUpdate('students')
  async updateStudent(@Param('id') id: string, @Body() data: any) {
    return { message: `Student ${id} updated (requires students:update)` };
  }

  /**
   * Example 6: Delete operation
   * User must have 'students:delete' permission
   */
  @Delete('students/:id')
  @CanDelete('students')
  async deleteStudent(@Param('id') id: string) {
    return { message: `Student ${id} deleted (requires students:delete)` };
  }

  /**
   * Example 7: Export operation
   * User must have 'leads:export' permission
   */
  @Get('leads/export')
  @CanExport('leads')
  async exportLeads() {
    return { message: 'Leads exported (requires leads:export permission)' };
  }

  /**
   * Example 8: Custom action
   * User must have 'applications:approve' permission
   */
  @Post('applications/:id/approve')
  @RequirePermissions('applications:approve')
  async approveApplication(@Param('id') id: string) {
    return { 
      message: `Application ${id} approved (requires applications:approve)` 
    };
  }

  /**
   * Example 9: Multiple module permissions
   * User must have permissions from different modules
   */
  @Post('complex-operation')
  @RequirePermissions('leads:read', 'students:create', 'tasks:create')
  async complexOperation(@Body() data: any) {
    return { 
      message: 'Complex operation (requires multiple permissions)' 
    };
  }

  /**
   * Example 10: Accessing user info with permissions
   * The request object contains authenticated user info
   */
  @Get('my-permissions')
  @RequirePermissions('dashboard:read')
  async getMyPermissions(@Request() req: any) {
    return {
      userId: req.user.id,
      email: req.user.email,
      tenantId: req.tenantId,
      message: 'User has dashboard:read permission',
    };
  }

  /**
   * Example 11: Public endpoint (no permission required)
   * Simply don't add the @RequirePermissions decorator
   * But still requires authentication (JwtAuthGuard)
   */
  @Get('public-info')
  async getPublicInfo() {
    return { message: 'Public info (authenticated but no specific permission)' };
  }

  /**
   * Example 12: Admin-only endpoint
   * While not using @AdminOnly decorator directly,
   * Super Admin and Admin roles will have this permission
   */
  @Post('settings')
  @RequirePermissions('settings:update')
  async updateSettings(@Body() data: any) {
    return { message: 'Settings updated (typically admin only)' };
  }

  /**
   * Example 13: Service-specific permissions
   */
  @Post('services/assign')
  @RequirePermissions('services:assign')
  async assignService(@Body() data: any) {
    return { message: 'Service assigned (requires services:assign)' };
  }

  /**
   * Example 14: Workflow execution
   */
  @Post('workflows/:id/execute')
  @RequirePermissions('workflows:execute')
  async executeWorkflow(@Param('id') id: string) {
    return { message: `Workflow ${id} executed (requires workflows:execute)` };
  }

  /**
   * Example 15: Document management
   */
  @Post('documents/upload')
  @RequirePermissions('documents:upload')
  async uploadDocument(@Body() data: any) {
    return { message: 'Document uploaded (requires documents:upload)' };
  }

  /**
   * Example 16: Payment processing
   */
  @Post('payments/process')
  @RequirePermissions('payments:process')
  async processPayment(@Body() data: any) {
    return { message: 'Payment processed (requires payments:process)' };
  }

  /**
   * Example 17: Messaging
   */
  @Post('messages/send')
  @RequirePermissions('messaging:send')
  async sendMessage(@Body() data: any) {
    return { message: 'Message sent (requires messaging:send)' };
  }

  /**
   * Example 18: Reports
   */
  @Get('reports/generate')
  @RequirePermissions('reports:create', 'reports:export')
  async generateReport() {
    return { 
      message: 'Report generated (requires reports:create and reports:export)' 
    };
  }
}

/**
 * USAGE IN YOUR ACTUAL CONTROLLERS:
 * 
 * 1. Import the necessary decorators and guards
 * 2. Apply PermissionsGuard to your controller or specific routes
 * 3. Use @RequirePermissions or convenience decorators (@CanCreate, @CanRead, etc.)
 * 4. The guard will automatically check if the authenticated user has required permissions
 * 5. If not, a 403 Forbidden error will be thrown
 * 6. Permission failures are logged to the audit_log table
 */

/**
 * TESTING PERMISSIONS:
 * 
 * 1. Create a user with a specific role
 * 2. Try to access endpoints with that user
 * 3. Check if 403 errors are returned for insufficient permissions
 * 4. Check audit_logs table for permission denial entries
 * 5. Test with admin users (should have access to everything)
 */
