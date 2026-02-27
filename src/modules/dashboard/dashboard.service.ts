import { Injectable } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class DashboardService {
  constructor(private tenantService: TenantService) {}

  /**
   * Get comprehensive dashboard overview with all statistics
   */
  async getDashboardOverview(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Execute all queries in parallel for optimal performance
    const [
      // Leads statistics
      totalLeads,
      leadsByStatus,
      leadsConvertedToStudents,
      recentLeads,

      // Students statistics
      totalStudents,
      studentsByStatus,
      recentStudents,

      // Visa applications statistics
      totalVisaApplications,
      visaApplicationsByStatus,
      activeVisaApplications,
      recentVisaApplications,

      // Tasks statistics
      totalTasks,
      tasksByStatus,
      overdueTasks,
      upcomingTasks,

      // Appointments statistics
      totalAppointments,
      upcomingAppointments,
      appointmentsByStatus,

      // Universities and courses
      totalUniversities,
      totalCourses,
      universitiesByCountry,

      // Countries and Visa Types
      totalCountries,
      totalVisaTypes,

      // Payments statistics
      totalPayments,
      paymentsByStatus,
      recentPayments,

      // Students by country distribution
      studentsByCountry,

      // Recent activities
      recentAuditLogs,

      // CMS Content statistics
      totalBlogPosts,
      publishedBlogPosts,
      activeFaqs,
      totalLandingPages,
      publishedLandingPages,
      totalScholarships,
      publishedScholarships,

      // Templates statistics
      totalEmailTemplates,
      activeEmailTemplates,
      totalSmsTemplates,
      activeSmsTemplates,

      // Messaging statistics (today)
      totalMessagesToday,
      emailsSentToday,
      smsSentToday,
      failedMessagesToday,
      messagesByStatus,
    ] = await Promise.all([
      // Leads queries
      tenantPrisma.lead.count({ where: { tenantId } }),
      tenantPrisma.lead.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      tenantPrisma.lead.count({
        where: { tenantId, status: 'Converted' },
      }),
      tenantPrisma.lead.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),

      // Students queries
      tenantPrisma.student.count({ where: { tenantId } }),
      tenantPrisma.student.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      tenantPrisma.student.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),

      // Visa applications queries
      tenantPrisma.visaApplication.count({ where: { tenantId } }),
      tenantPrisma.visaApplication.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      tenantPrisma.visaApplication.count({
        where: {
          tenantId,
          status: { in: ['Pending', 'Submitted', 'UnderReview'] },
        },
      }),
      tenantPrisma.visaApplication.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          visaType: {
            select: {
              name: true,
            },
          },
        },
      }),

      // Tasks queries
      tenantPrisma.task.count({ where: { tenantId } }),
      tenantPrisma.task.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      tenantPrisma.task.count({
        where: {
          tenantId,
          status: { not: 'Completed' },
          dueDate: { lt: new Date() },
        },
      }),
      tenantPrisma.task.findMany({
        where: {
          tenantId,
          status: { not: 'Completed' },
          dueDate: { gte: new Date() },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          relatedEntityType: true,
        },
      }),

      // Appointments queries
      tenantPrisma.appointment.count({ where: { tenantId } }),
      tenantPrisma.appointment.findMany({
        where: {
          tenantId,
          scheduledAt: { gte: new Date() },
          status: 'Scheduled',
        },
        take: 10,
        orderBy: { scheduledAt: 'asc' },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          staff: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      tenantPrisma.appointment.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),

      // Universities and courses
      tenantPrisma.university.count({ where: { tenantId } }),
      tenantPrisma.course.count({ where: { tenantId } }),
      tenantPrisma.university.groupBy({
        by: ['countryId'],
        where: { tenantId },
        _count: true,
      }),

      // Countries and visa types
      tenantPrisma.country.count({ where: { tenantId, isActive: true } }),
      tenantPrisma.visaType.count({ where: { tenantId, isActive: true } }),

      // Payments
      tenantPrisma.payment.count({ where: { tenantId } }),
      tenantPrisma.payment.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
        _sum: {
          amount: true,
        },
      }),
      tenantPrisma.payment.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      // Students distribution - placeholder (requires join with university -> country)
      Promise.resolve([]),

      // Recent audit logs
      tenantPrisma.activityLog.findMany({
        where: { tenantId },
        take: 20,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),

      // CMS Content statistics
      tenantPrisma.blogPost.count({ where: { tenantId } }),
      tenantPrisma.blogPost.count({
        where: { tenantId, status: 'Published' },
      }),
      tenantPrisma.fAQ.count({ where: { tenantId, isActive: true } }),
      tenantPrisma.landingPage.count({ where: { tenantId } }),
      tenantPrisma.landingPage.count({
        where: { tenantId, status: 'Published' },
      }),
      tenantPrisma.scholarship.count({ where: { tenantId } }),
      tenantPrisma.scholarship.count({
        where: { tenantId, status: 'Published' },
      }),

      // Templates statistics
      tenantPrisma.emailTemplate.count({ where: { tenantId } }),
      tenantPrisma.emailTemplate.count({
        where: { tenantId, status: 'Active' },
      }),
      tenantPrisma.sMSTemplate.count({ where: { tenantId } }),
      tenantPrisma.sMSTemplate.count({
        where: { tenantId, status: 'Active' },
      }),

      // Messaging statistics (today)
      tenantPrisma.messageLog.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      tenantPrisma.messageLog.count({
        where: {
          tenantId,
          messageType: 'Email',
          status: 'Sent',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      tenantPrisma.messageLog.count({
        where: {
          tenantId,
          messageType: 'SMS',
          status: 'Sent',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      tenantPrisma.messageLog.count({
        where: {
          tenantId,
          status: 'Failed',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      tenantPrisma.messageLog.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    // Calculate revenue summary
    // @ts-ignore
    const totalRevenue = paymentsByStatus
      .filter((p: any) => p.status === 'Completed')
      .reduce((sum: number, p: any) => sum + Number(p._sum.amount || 0), 0);

    // @ts-ignore
    const pendingRevenue = paymentsByStatus
      .filter((p: any) => p.status === 'Pending')
      .reduce((sum: number, p: any) => sum + Number(p._sum.amount || 0), 0);

    // @ts-ignore - Complex Prisma groupBy return type
    return {
      leads: {
        total: totalLeads,
        byStatus: leadsByStatus.map((item: any) => ({
          status: item.status,
          count: item._count,
        })),
        converted: leadsConvertedToStudents,
        recent: recentLeads,
      },
      students: {
        total: totalStudents,
        byStatus: studentsByStatus.map((item: any) => ({
          status: item.status,
          count: item._count,
        })),
        recent: recentStudents,
      },
      visaApplications: {
        total: totalVisaApplications,
        active: activeVisaApplications,
        byStatus: visaApplicationsByStatus.map((item: any) => ({
          status: item.status,
          count: item._count,
        })),
        recent: recentVisaApplications,
      },
      tasks: {
        total: totalTasks,
        overdue: overdueTasks,
        byStatus: tasksByStatus.map((item: any) => ({
          status: item.status,
          count: item._count,
        })),
        upcoming: upcomingTasks,
      },
      appointments: {
        total: totalAppointments,
        upcoming: upcomingAppointments,
        byStatus: appointmentsByStatus.map((item: any) => ({
          status: item.status,
          count: item._count,
        })),
      },
      universities: {
        total: totalUniversities,
        byCountry: universitiesByCountry.map((item: any) => ({
          countryId: item.countryId,
          count: item._count,
        })),
      },
      courses: {
        total: totalCourses,
      },
      countries: {
        total: totalCountries,
      },
      visaTypes: {
        total: totalVisaTypes,
      },
      payments: {
        total: totalPayments,
        byStatus: paymentsByStatus.map((item: any) => ({
          status: item.status,
          count: item._count,
          amount: Number(item._sum.amount || 0),
        })),
        recent: recentPayments,
        revenue: {
          total: totalRevenue,
          pending: pendingRevenue,
        },
      },
      cms: {
        blogs: {
          total: totalBlogPosts,
          published: publishedBlogPosts,
        },
        faqs: {
          total: activeFaqs,
        },
        landingPages: {
          total: totalLandingPages,
          published: publishedLandingPages,
        },
        scholarships: {
          total: totalScholarships,
          published: publishedScholarships,
        },
      },
      templates: {
        email: {
          total: totalEmailTemplates,
          active: activeEmailTemplates,
        },
        sms: {
          total: totalSmsTemplates,
          active: activeSmsTemplates,
        },
      },
      messaging: {
        today: {
          total: totalMessagesToday,
          emailsSent: emailsSentToday,
          smsSent: smsSentToday,
          failed: failedMessagesToday,
        },
        byStatus: messagesByStatus.map((item: any) => ({
          status: item.status,
          count: item._count,
        })),
      },
      recentActivities: recentAuditLogs,
    };
  }

  /**
   * Get statistics for a specific date range
   */
  async getStatsByDateRange(tenantId: string, startDate: Date, endDate: Date) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const [leadsCreated, studentsCreated, visasCreated, paymentsReceived] = await Promise.all([
      tenantPrisma.lead.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      tenantPrisma.student.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      tenantPrisma.visaApplication.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      tenantPrisma.payment.aggregate({
        where: {
          tenantId,
          status: 'Completed',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),
    ]);

    return {
      period: {
        startDate,
        endDate,
      },
      leadsCreated,
      studentsCreated,
      visasCreated,
      paymentsReceived: {
        count: paymentsReceived._count,
        total: Number(paymentsReceived._sum.amount || 0),
      },
    };
  }
}
