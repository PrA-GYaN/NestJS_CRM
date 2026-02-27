import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { TemplatesService } from '../templates/templates.service';
import { SendEmailDto, SendSmsDto, TriggerEventMessageDto, MessageStatus } from './dto/messaging.dto';
import { PaginationDto } from '../../common/dto/common.dto';
import { TemplateStatus } from '../templates/dto/email-template.dto';

@Injectable()
export class MessagingService {
  constructor(
    private tenantService: TenantService,
    private templatesService: TemplatesService,
  ) {}

  // ============================================
  // EMAIL SENDING
  // ============================================

  async sendEmail(tenantId: string, sendEmailDto: SendEmailDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Get template - this already validates tenant ownership
    const template = await this.templatesService.getEmailTemplateById(
      tenantId,
      sendEmailDto.templateId,
    );

    if (template.status !== TemplateStatus.Active) {
      throw new BadRequestException('Email template is not active');
    }

    // Substitute variables
    const subject = this.templatesService.substituteVariables(
      template.subject,
      sendEmailDto.variables,
    );
    const body = this.templatesService.substituteVariables(
      template.body,
      sendEmailDto.variables,
    );

    // Log the message
    const messageLog = await tenantPrisma.messageLog.create({
      data: {
        tenantId,
        messageType: 'Email',
        emailTemplateId: template.id,
        recipientEmail: sendEmailDto.recipientEmail,
        subject,
        body,
        variables: sendEmailDto.variables,
        eventType: sendEmailDto.eventType,
        metadata: sendEmailDto.metadata,
        status: MessageStatus.Pending,
      },
    });

    // TODO: Integrate with actual email service (e.g., SendGrid, AWS SES, etc.)
    // For now, we'll mark it as sent immediately
    try {
      // Simulate email sending
      await this.simulateEmailSending(sendEmailDto.recipientEmail, subject, body);

      // Update message log
      await tenantPrisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: MessageStatus.Sent,
          sentAt: new Date(),
        },
      });

      return {
        success: true,
        messageId: messageLog.id,
        message: 'Email sent successfully',
      };
    } catch (error) {
      // Update message log with error
      await tenantPrisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: MessageStatus.Failed,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw new BadRequestException('Failed to send email: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // ============================================
  // SMS SENDING
  // ============================================

  async sendSms(tenantId: string, sendSmsDto: SendSmsDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Get template - this already validates tenant ownership
    const template = await this.templatesService.getSmsTemplateById(
      tenantId,
      sendSmsDto.templateId,
    );

    if (template.status !== TemplateStatus.Active) {
      throw new BadRequestException('SMS template is not active');
    }

    // Substitute variables
    const body = this.templatesService.substituteVariables(
      template.body,
      sendSmsDto.variables,
    );

    // Log the message
    const messageLog = await tenantPrisma.messageLog.create({
      data: {
        tenantId,
        messageType: 'SMS',
        smsTemplateId: template.id,
        recipientPhone: sendSmsDto.recipientPhone,
        body,
        variables: sendSmsDto.variables,
        eventType: sendSmsDto.eventType,
        metadata: sendSmsDto.metadata,
        status: MessageStatus.Pending,
      },
    });

    // TODO: Integrate with actual SMS service (e.g., Twilio, AWS SNS, etc.)
    try {
      // Simulate SMS sending
      await this.simulateSmsSending(sendSmsDto.recipientPhone, body);

      // Update message log
      await tenantPrisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: MessageStatus.Sent,
          sentAt: new Date(),
        },
      });

      return {
        success: true,
        messageId: messageLog.id,
        message: 'SMS sent successfully',
      };
    } catch (error) {
      // Update message log with error
      await tenantPrisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: MessageStatus.Failed,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw new BadRequestException('Failed to send SMS: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // ============================================
  // EVENT-DRIVEN MESSAGING
  // ============================================

  async triggerEventMessage(tenantId: string, triggerDto: TriggerEventMessageDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const results = {
      emailSent: false,
      smsSent: false,
      errors: [] as string[],
    };

    // Find active templates for this event type
    const [emailTemplates, smsTemplates] = await Promise.all([
      tenantPrisma.emailTemplate.findMany({
        where: {
          tenantId,
          eventType: triggerDto.eventType,
          status: TemplateStatus.Active,
        },
      }),
      tenantPrisma.sMSTemplate.findMany({
        where: {
          tenantId,
          eventType: triggerDto.eventType,
          status: TemplateStatus.Active,
        },
      }),
    ]);

    // Send email if template exists and recipient email provided
    if (emailTemplates.length > 0 && triggerDto.recipientEmail) {
      try {
        await this.sendEmail(tenantId, {
          templateId: emailTemplates[0].id,
          recipientEmail: triggerDto.recipientEmail,
          variables: triggerDto.variables,
          eventType: triggerDto.eventType,
          metadata: triggerDto.metadata,
        });
        results.emailSent = true;
      } catch (error) {
        results.errors.push(`Email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Send SMS if template exists and recipient phone provided
    if (smsTemplates.length > 0 && triggerDto.recipientPhone) {
      try {
        await this.sendSms(tenantId, {
          templateId: smsTemplates[0].id,
          recipientPhone: triggerDto.recipientPhone,
          variables: triggerDto.variables,
          eventType: triggerDto.eventType,
          metadata: triggerDto.metadata,
        });
        results.smsSent = true;
      } catch (error) {
        results.errors.push(`SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  // ============================================
  // MESSAGE TRACKING
  // ============================================

  async getMessageLogs(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId, // CRITICAL: Always filter by tenantId
    };

    const [messages, total] = await Promise.all([
      tenantPrisma.messageLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          emailTemplate: {
            select: {
              id: true,
              name: true,
            },
          },
          smsTemplate: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      tenantPrisma.messageLog.count({ where }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMessageLogById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const message = await tenantPrisma.messageLog.findFirst({
      where: {
        id,
        tenantId, // CRITICAL: Must match tenant
      },
      include: {
        emailTemplate: true,
        smsTemplate: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message log not found');
    }

    return message;
  }

  // ============================================
  // UTILITY METHODS (For simulation - replace with real services)
  // ============================================

  private async simulateEmailSending(to: string, subject: string, body: string): Promise<void> {
    // TODO: Replace with actual email service integration
    console.log(`[EMAIL SIMULATION] To: ${to}, Subject: ${subject}`);
    console.log(`Body: ${body.substring(0, 100)}...`);
    
    // Simulate async operation
    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async simulateSmsSending(to: string, body: string): Promise<void> {
    // TODO: Replace with actual SMS service integration
    console.log(`[SMS SIMULATION] To: ${to}`);
    console.log(`Body: ${body}`);
    
    // Simulate async operation
    return new Promise((resolve) => setTimeout(resolve, 100));
  }
}
