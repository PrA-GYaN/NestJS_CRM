import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { MasterPrismaService } from '../common/prisma/master-prisma.service';
import { TenantService } from '../common/tenant/tenant.service';

async function seedFirstTenantData() {
  console.log('🌱 Starting first-tenant sample data seeding...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const masterPrisma = app.get(MasterPrismaService);
    const tenantService = app.get(TenantService);

    const firstTenant = await masterPrisma.tenant.findFirst({
      where: { status: 'Active' },
      orderBy: { createdAt: 'asc' },
    });

    if (!firstTenant) {
      throw new Error('No active tenant found. Create a tenant first.');
    }

    const tenantId = firstTenant.id;
    const tenantPrisma = await tenantService.getTenantPrisma(tenantId);

    console.log(`📦 Seeding tenant: ${firstTenant.name} (${firstTenant.subdomain})`);
    console.log(`🆔 Tenant ID: ${tenantId}\n`);

    const hashedPassword = await bcrypt.hash('Student@123456', 10);

    const superAdminRole =
      (await tenantPrisma.role.findFirst({
        where: { tenantId, name: 'SUPER_ADMIN' },
      })) ||
      (await tenantPrisma.role.create({
        data: {
          tenantId,
          name: 'SUPER_ADMIN',
          description: 'Super admin role',
          isAdmin: true,
        },
      }));

    const counselorRole =
      (await tenantPrisma.role.findFirst({
        where: { tenantId, name: 'COUNSELOR' },
      })) ||
      (await tenantPrisma.role.create({
        data: {
          tenantId,
          name: 'COUNSELOR',
          description: 'Counselor role for student handling',
          isAdmin: false,
        },
      }));

    const adminUser =
      (await tenantPrisma.user.findFirst({
        where: { tenantId, roleId: superAdminRole.id },
      })) ||
      (await tenantPrisma.user.create({
        data: {
          tenantId,
          name: `${firstTenant.name} Admin`,
          email: `${firstTenant.subdomain}.admin@example.com`,
          password: hashedPassword,
          roleId: superAdminRole.id,
          status: 'Active',
        },
      }));

    const counselorUser =
      (await tenantPrisma.user.findFirst({
        where: { tenantId, email: `${firstTenant.subdomain}.counselor@example.com` },
      })) ||
      (await tenantPrisma.user.create({
        data: {
          tenantId,
          name: 'Jane Counselor',
          email: `${firstTenant.subdomain}.counselor@example.com`,
          password: hashedPassword,
          roleId: counselorRole.id,
          status: 'Active',
        },
      }));

    const leadOne =
      (await tenantPrisma.lead.findFirst({
        where: { tenantId, email: `${firstTenant.subdomain}.lead1@example.com` },
      })) ||
      (await tenantPrisma.lead.create({
        data: {
          tenantId,
          assignedUserId: counselorUser.id,
          firstName: 'Aarav',
          lastName: 'Sharma',
          email: `${firstTenant.subdomain}.lead1@example.com`,
          phone: '+9779800000001',
          academicBackground: 'High School Graduate',
          studyInterests: 'Computer Science',
          status: 'Qualified',
          priority: 'High',
          source: 'Website',
        },
      }));

    const leadTwo =
      (await tenantPrisma.lead.findFirst({
        where: { tenantId, email: `${firstTenant.subdomain}.lead2@example.com` },
      })) ||
      (await tenantPrisma.lead.create({
        data: {
          tenantId,
          assignedUserId: counselorUser.id,
          firstName: 'Mia',
          lastName: 'Thapa',
          email: `${firstTenant.subdomain}.lead2@example.com`,
          phone: '+9779800000002',
          academicBackground: 'Bachelor in Business',
          studyInterests: 'MBA',
          status: 'Contacted',
          priority: 'Medium',
          source: 'Referral',
        },
      }));

    const studentOne =
      (await tenantPrisma.student.findFirst({
        where: { tenantId, email: `${firstTenant.subdomain}.student1@example.com` },
      })) ||
      (await tenantPrisma.student.create({
        data: {
          tenantId,
          leadId: leadOne.id,
          firstName: 'Aarav',
          lastName: 'Sharma',
          email: `${firstTenant.subdomain}.student1@example.com`,
          phone: '+9779700000001',
          password: hashedPassword,
          hashedPassword,
          status: 'Prospective',
          priority: 'High',
          profileCompleteness: 65,
          assignedCounselorId: counselorUser.id,
          academicRecords: {
            latestDegree: 'High School',
            year: 2024,
            gpa: '3.6',
          },
          testScores: {
            ielts: 6.5,
          },
        },
      }));

    const studentTwo =
      (await tenantPrisma.student.findFirst({
        where: { tenantId, email: `${firstTenant.subdomain}.student2@example.com` },
      })) ||
      (await tenantPrisma.student.create({
        data: {
          tenantId,
          leadId: leadTwo.id,
          firstName: 'Mia',
          lastName: 'Thapa',
          email: `${firstTenant.subdomain}.student2@example.com`,
          phone: '+9779700000002',
          password: hashedPassword,
          hashedPassword,
          status: 'Enrolled',
          priority: 'Medium',
          profileCompleteness: 85,
          assignedCounselorId: counselorUser.id,
          academicRecords: {
            latestDegree: 'BBA',
            year: 2023,
            gpa: '3.8',
          },
          testScores: {
            ielts: 7.0,
          },
        },
      }));

    const studentDocument =
      (await tenantPrisma.studentDocument.findFirst({
        where: {
          tenantId,
          studentId: studentOne.id,
          documentType: 'Passport',
        },
      })) ||
      (await tenantPrisma.studentDocument.create({
        data: {
          tenantId,
          studentId: studentOne.id,
          documentType: 'Passport',
          filePath: `uploads/${tenantId}/students/${studentOne.id}/passport.pdf`,
          fileName: 'passport.pdf',
          fileSize: 245760,
          verificationStatus: 'Pending',
          metadata: {
            source: 'seed',
          },
        },
      }));

    const countryNpl = await tenantPrisma.country.upsert({
      where: { tenantId_code: { tenantId, code: 'NP' } },
      update: { isActive: true },
      create: {
        tenantId,
        name: 'Nepal',
        code: 'NP',
        isActive: true,
      },
    });

    const countryAus = await tenantPrisma.country.upsert({
      where: { tenantId_code: { tenantId, code: 'AU' } },
      update: { isActive: true },
      create: {
        tenantId,
        name: 'Australia',
        code: 'AU',
        isActive: true,
      },
    });

    const universityOne =
      (await tenantPrisma.university.findFirst({
        where: { tenantId, name: 'Sydney International University' },
      })) ||
      (await tenantPrisma.university.create({
        data: {
          tenantId,
          countryId: countryAus.id,
          name: 'Sydney International University',
          ranking: 85,
          description: 'Sample seeded university',
        },
      }));

    const universityTwo =
      (await tenantPrisma.university.findFirst({
        where: { tenantId, name: 'Kathmandu Global College' },
      })) ||
      (await tenantPrisma.university.create({
        data: {
          tenantId,
          countryId: countryNpl.id,
          name: 'Kathmandu Global College',
          ranking: 220,
          description: 'Sample local partner institution',
        },
      }));

    const courseOne =
      (await tenantPrisma.course.findFirst({
        where: { tenantId, name: 'Master of Data Science' },
      })) ||
      (await tenantPrisma.course.create({
        data: {
          tenantId,
          universityId: universityOne.id,
          name: 'Master of Data Science',
          fees: 32000,
          duration: '2 years',
          requirements: {
            minGpa: 3.0,
            english: 'IELTS 6.5',
          },
          intakePeriods: ['February 2026', 'July 2026'],
          deadlines: {
            feb: '2025-11-30',
            jul: '2026-04-15',
          },
        },
      }));

    const courseTwo =
      (await tenantPrisma.course.findFirst({
        where: { tenantId, name: 'MBA - International Business' },
      })) ||
      (await tenantPrisma.course.create({
        data: {
          tenantId,
          universityId: universityTwo.id,
          name: 'MBA - International Business',
          fees: 18000,
          duration: '18 months',
          requirements: {
            minGpa: 2.8,
            english: 'IELTS 6.0',
          },
          intakePeriods: ['January 2026', 'August 2026'],
          deadlines: {
            jan: '2025-10-15',
            aug: '2026-05-31',
          },
        },
      }));

    const classOne =
      (await tenantPrisma.class.findFirst({
        where: { tenantId, name: 'IELTS Preparation - Batch A' },
      })) ||
      (await tenantPrisma.class.create({
        data: {
          tenantId,
          name: 'IELTS Preparation - Batch A',
          description: 'Basic IELTS preparation class',
          schedule: {
            days: ['Monday', 'Wednesday', 'Friday'],
            startTime: '10:00',
            endTime: '12:00',
          },
          studentCapacity: 25,
          instructorId: counselorUser.id,
        },
      }));

    await tenantPrisma.classEnrollment.upsert({
      where: {
        classId_studentId: {
          classId: classOne.id,
          studentId: studentOne.id,
        },
      },
      update: { status: 'Active' },
      create: {
        classId: classOne.id,
        studentId: studentOne.id,
        status: 'Active',
      },
    });

    const classBookingRequest =
      (await tenantPrisma.classBookingRequest.findFirst({
        where: {
          tenantId,
          classId: classOne.id,
          studentId: studentTwo.id,
        },
      })) ||
      (await tenantPrisma.classBookingRequest.create({
        data: {
          tenantId,
          classId: classOne.id,
          studentId: studentTwo.id,
          status: 'Pending',
          notes: 'Interested in next available batch',
        },
      }));

    const testIelts =
      (await tenantPrisma.test.findFirst({
        where: { name: 'IELTS Mock Test - Set 1' },
      })) ||
      (await tenantPrisma.test.create({
        data: {
          name: 'IELTS Mock Test - Set 1',
          type: 'IELTS',
          description: 'Seeded IELTS practice test',
          studentCapacity: 100,
        },
      }));

    const testAssignment =
      (await tenantPrisma.testAssignment.findFirst({
        where: {
          testId: testIelts.id,
          studentId: studentOne.id,
        },
      })) ||
      (await tenantPrisma.testAssignment.create({
        data: {
          testId: testIelts.id,
          studentId: studentOne.id,
          status: 'Pending',
        },
      }));

    await tenantPrisma.tenantWorkingHours.upsert({
      where: {
        tenantId_dayOfWeek: {
          tenantId,
          dayOfWeek: 'Monday',
        },
      },
      update: {
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
        isActive: true,
      },
      create: {
        tenantId,
        dayOfWeek: 'Monday',
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
        isActive: true,
      },
    });

    await tenantPrisma.tenantWorkingHours.upsert({
      where: {
        tenantId_dayOfWeek: {
          tenantId,
          dayOfWeek: 'Tuesday',
        },
      },
      update: {
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
        isActive: true,
      },
      create: {
        tenantId,
        dayOfWeek: 'Tuesday',
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
        isActive: true,
      },
    });

    const appointmentStart = new Date();
    appointmentStart.setDate(appointmentStart.getDate() + 2);
    appointmentStart.setHours(10, 0, 0, 0);

    const appointmentEnd = new Date(appointmentStart.getTime() + 60 * 60 * 1000);

    const appointment =
      (await tenantPrisma.appointment.findFirst({
        where: {
          tenantId,
          studentId: studentOne.id,
          staffId: counselorUser.id,
          scheduledAt: appointmentStart,
        },
      })) ||
      (await tenantPrisma.appointment.create({
        data: {
          tenantId,
          studentId: studentOne.id,
          staffId: counselorUser.id,
          scheduledAt: appointmentStart,
          duration: 60,
          endTime: appointmentEnd,
          purpose: 'University shortlisting discussion',
          status: 'Booked',
          requestedBy: 'Staff',
          approvedAt: new Date(),
          approvedBy: counselorUser.id,
        },
      }));

    const task =
      (await tenantPrisma.task.findFirst({
        where: {
          tenantId,
          title: 'Collect missing student documents',
        },
      })) ||
      (await tenantPrisma.task.create({
        data: {
          tenantId,
          assignedTo: counselorUser.id,
          relatedEntityType: 'Student',
          relatedEntityId: studentOne.id,
          title: 'Collect missing student documents',
          description: 'Follow up for transcript and recommendation letter',
          status: 'InProgress',
          priority: 'High',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      }));

    const visaType = await tenantPrisma.visaType.upsert({
      where: {
        tenantId_countryId_name: {
          tenantId,
          countryId: countryAus.id,
          name: 'Student Visa (Subclass 500)',
        },
      },
      update: { isActive: true },
      create: {
        tenantId,
        countryId: countryAus.id,
        name: 'Student Visa (Subclass 500)',
        description: 'Australia student visa for international applicants',
        isActive: true,
      },
    });

    const visaWorkflow =
      (await tenantPrisma.visaWorkflow.findFirst({
        where: { tenantId, visaTypeId: visaType.id, name: 'Australia Student Visa Workflow' },
      })) ||
      (await tenantPrisma.visaWorkflow.create({
        data: {
          tenantId,
          visaTypeId: visaType.id,
          name: 'Australia Student Visa Workflow',
          description: 'Standard visa processing workflow',
          isActive: true,
        },
      }));

    const visaStep = await tenantPrisma.visaWorkflowStep.upsert({
      where: {
        workflowId_stepOrder: {
          workflowId: visaWorkflow.id,
          stepOrder: 1,
        },
      },
      update: {
        name: 'Document Collection',
        requiresDocument: true,
        isActive: true,
      },
      create: {
        tenantId,
        workflowId: visaWorkflow.id,
        name: 'Document Collection',
        description: 'Collect all required documents for visa filing',
        stepOrder: 1,
        requiresDocument: true,
        isActive: true,
        expectedDurationDays: 7,
      },
    });

    const visaApplication =
      (await tenantPrisma.visaApplication.findFirst({
        where: {
          tenantId,
          studentId: studentOne.id,
          visaTypeId: visaType.id,
        },
      })) ||
      (await tenantPrisma.visaApplication.create({
        data: {
          tenantId,
          studentId: studentOne.id,
          visaTypeId: visaType.id,
          destinationCountry: 'Australia',
          status: 'UnderReview',
          currentStepId: visaStep.id,
          submissionDate: new Date(),
          notes: 'Initial seeded visa application',
        },
      }));

    const visaDocument =
      (await tenantPrisma.visaDocument.findFirst({
        where: {
          tenantId,
          visaApplicationId: visaApplication.id,
          documentType: 'VisaForm',
        },
      })) ||
      (await tenantPrisma.visaDocument.create({
        data: {
          tenantId,
          visaApplicationId: visaApplication.id,
          documentType: 'VisaForm',
          filePath: `uploads/${tenantId}/visa/${visaApplication.id}/visa-form.pdf`,
        },
      }));

    const service =
      (await tenantPrisma.service.findFirst({
        where: { tenantId, name: 'End-to-End Application Support' },
      })) ||
      (await tenantPrisma.service.create({
        data: {
          tenantId,
          name: 'End-to-End Application Support',
          description: 'Profile evaluation, applications, and follow-up support',
          price: 1500,
        },
      }));

    await tenantPrisma.studentService.upsert({
      where: {
        studentId_serviceId: {
          studentId: studentOne.id,
          serviceId: service.id,
        },
      },
      update: {
        notes: 'Priority support package',
      },
      create: {
        tenantId,
        studentId: studentOne.id,
        serviceId: service.id,
        notes: 'Priority support package',
      },
    });

    const serviceBookingRequest =
      (await tenantPrisma.serviceBookingRequest.findFirst({
        where: {
          tenantId,
          serviceId: service.id,
          studentId: studentTwo.id,
        },
      })) ||
      (await tenantPrisma.serviceBookingRequest.create({
        data: {
          tenantId,
          serviceId: service.id,
          studentId: studentTwo.id,
          status: 'Pending',
          notes: 'Need details about package inclusions',
        },
      }));

    const payment =
      (await tenantPrisma.payment.findFirst({
        where: {
          tenantId,
          invoiceNumber: `INV-${firstTenant.subdomain.toUpperCase()}-001`,
        },
      })) ||
      (await tenantPrisma.payment.create({
        data: {
          tenantId,
          studentId: studentOne.id,
          serviceId: service.id,
          processedBy: adminUser.id,
          currency: 'USD',
          totalAmount: 1500,
          paidAmount: 500,
          remainingAmount: 1000,
          paymentType: 'Advance',
          paymentMethod: 'BankTransfer',
          status: 'PartiallyPaid',
          invoiceNumber: `INV-${firstTenant.subdomain.toUpperCase()}-001`,
          transactionReference: `TXN-${Date.now()}`,
          notes: 'Advance payment for service package',
          paymentDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      }));

    const commission =
      (await tenantPrisma.commission.findFirst({
        where: {
          serviceId: service.id,
          universityId: universityOne.id,
        },
      })) ||
      (await tenantPrisma.commission.create({
        data: {
          serviceId: service.id,
          universityId: universityOne.id,
          amount: 350,
          status: 'Pending',
        },
      }));

    const courseApplication =
      (await tenantPrisma.courseApplication.findFirst({
        where: {
          tenantId,
          studentId: studentOne.id,
          courseId: courseOne.id,
        },
      })) ||
      (await tenantPrisma.courseApplication.create({
        data: {
          tenantId,
          studentId: studentOne.id,
          courseId: courseOne.id,
          universityId: universityOne.id,
          status: 'Submitted',
          applicationDate: new Date(),
          submissionDate: new Date(),
          intakePeriod: 'July 2026',
          applicationFee: 120,
          notes: {
            counselorNote: 'Strong profile, likely to receive offer',
          },
          assignedTo: counselorUser.id,
        },
      }));

    const blogPost = await tenantPrisma.blogPost.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: 'study-in-australia-guide',
        },
      },
      update: {
        status: 'Published',
        publishedAt: new Date(),
      },
      create: {
        tenantId,
        title: 'Study in Australia: A Quick Starter Guide',
        slug: 'study-in-australia-guide',
        excerpt: 'Important things students should prepare before applying.',
        content: 'This is sample seeded blog content for first-tenant setup.',
        author: 'CRM Content Team',
        tags: ['Australia', 'Student Visa', 'Admission'],
        status: 'Published',
        publishedAt: new Date(),
      },
    });

    const faq =
      (await tenantPrisma.fAQ.findFirst({
        where: {
          tenantId,
          question: 'What is the usual visa processing time?',
        },
      })) ||
      (await tenantPrisma.fAQ.create({
        data: {
          tenantId,
          category: 'Visa',
          question: 'What is the usual visa processing time?',
          answer: 'Usually between 4 and 8 weeks depending on season and country.',
          sortOrder: 1,
          isActive: true,
        },
      }));

    const landingPage = await tenantPrisma.landingPage.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: 'home',
        },
      },
      update: {
        status: 'Published',
        publishedAt: new Date(),
      },
      create: {
        tenantId,
        title: `${firstTenant.name} Home`,
        slug: 'home',
        content: 'Welcome to our education consultancy platform.',
        status: 'Published',
        publishedAt: new Date(),
      },
    });

    const scholarship = await tenantPrisma.scholarship.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: 'sydney-merit-scholarship-2026',
        },
      },
      update: {
        status: 'Published',
      },
      create: {
        tenantId,
        title: 'Sydney Merit Scholarship 2026',
        slug: 'sydney-merit-scholarship-2026',
        description: 'Merit-based scholarship for high-achieving students.',
        eligibility: 'Minimum GPA 3.5 and IELTS 6.5',
        amount: 5000,
        currency: 'USD',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        applicationUrl: 'https://example.com/scholarship/apply',
        universityName: universityOne.name,
        countryName: 'Australia',
        status: 'Published',
        publishedAt: new Date(),
      },
    });

    const emailTemplate = await tenantPrisma.emailTemplate.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'WELCOME_STUDENT',
        },
      },
      update: {
        status: 'Active',
      },
      create: {
        tenantId,
        name: 'WELCOME_STUDENT',
        subject: 'Welcome to our consultancy platform',
        body: 'Hi {{studentName}}, welcome to {{tenantName}}. We are excited to support your journey.',
        variables: ['studentName', 'tenantName'],
        eventType: 'WelcomeEmail',
        status: 'Active',
        description: 'Welcome email for newly onboarded students',
      },
    });

    const smsTemplate = await tenantPrisma.sMSTemplate.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'APPOINTMENT_REMINDER_SMS',
        },
      },
      update: {
        status: 'Active',
      },
      create: {
        tenantId,
        name: 'APPOINTMENT_REMINDER_SMS',
        body: 'Hi {{studentName}}, this is a reminder for your appointment on {{appointmentDate}}.',
        variables: ['studentName', 'appointmentDate'],
        eventType: 'AppointmentReminder',
        status: 'Active',
        description: 'SMS reminder before appointments',
      },
    });

    const messageLog =
      (await tenantPrisma.messageLog.findFirst({
        where: {
          tenantId,
          subject: 'Welcome to our consultancy platform',
          recipientEmail: studentOne.email,
        },
      })) ||
      (await tenantPrisma.messageLog.create({
        data: {
          tenantId,
          messageType: 'Email',
          emailTemplateId: emailTemplate.id,
          recipientEmail: studentOne.email,
          subject: 'Welcome to our consultancy platform',
          body: `Hi ${studentOne.firstName}, welcome to ${firstTenant.name}.`,
          variables: {
            studentName: studentOne.firstName,
            tenantName: firstTenant.name,
          },
          eventType: 'WelcomeEmail',
          status: 'Sent',
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      }));

    const fileUpload =
      (await tenantPrisma.fileUpload.findFirst({
        where: {
          tenantId,
          storedFileName: `seed-passport-${studentDocument.id}.pdf`,
        },
      })) ||
      (await tenantPrisma.fileUpload.create({
        data: {
          tenantId,
          studentId: studentOne.id,
          visaApplicationId: visaApplication.id,
          courseId: courseOne.id,
          category: 'Passport',
          originalFileName: 'passport.pdf',
          storedFileName: `seed-passport-${studentDocument.id}.pdf`,
          filePath: `uploads/${tenantId}/seed/passport.pdf`,
          fileSize: 245760,
          mimeType: 'application/pdf',
          uploadedBy: counselorUser.id,
          metadata: {
            source: 'seed-script',
          },
        },
      }));

    const studentNotification =
      (await tenantPrisma.studentNotification.findFirst({
        where: {
          tenantId,
          studentId: studentOne.id,
          title: 'Application submitted successfully',
        },
      })) ||
      (await tenantPrisma.studentNotification.create({
        data: {
          tenantId,
          studentId: studentOne.id,
          type: 'Application',
          title: 'Application submitted successfully',
          message: 'Your course application has been submitted for review.',
          isRead: false,
          actionUrl: `/student/applications/${courseApplication.id}`,
        },
      }));

    const notification =
      (await tenantPrisma.notification.findFirst({
        where: {
          tenantId,
          userId: counselorUser.id,
          message: 'You have a new assigned task.',
        },
      })) ||
      (await tenantPrisma.notification.create({
        data: {
          tenantId,
          userId: counselorUser.id,
          type: 'Task',
          message: 'You have a new assigned task.',
          status: 'Unread',
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
          },
        },
      }));

    const activityLog =
      (await tenantPrisma.activityLog.findFirst({
        where: {
          tenantId,
          entityType: 'Student',
          entityId: studentOne.id,
          action: 'Created',
        },
      })) ||
      (await tenantPrisma.activityLog.create({
        data: {
          tenantId,
          userId: adminUser.id,
          entityType: 'Student',
          entityId: studentOne.id,
          action: 'Created',
          changes: {
            status: 'Prospective',
          },
          metadata: {
            source: 'seed-script',
          },
        },
      }));

    console.log('✅ Seeded module samples successfully:');
    console.log('   - Users, roles, leads, students, and student documents');
    console.log('   - Countries, universities, courses, and applications');
    console.log('   - Classes, tests, appointments, tasks, and working hours');
    console.log('   - Visa workflow, services, payments, and commissions');
    console.log('   - CMS, messaging templates/logs, notifications, and activity logs');

    console.log('\n📊 Seed Summary IDs:');
    console.log(`   Lead #1: ${leadOne.id}`);
    console.log(`   Lead #2: ${leadTwo.id}`);
    console.log(`   Student #1: ${studentOne.id}`);
    console.log(`   Student #2: ${studentTwo.id}`);
    console.log(`   Course App: ${courseApplication.id}`);
    console.log(`   Visa App: ${visaApplication.id}`);
    console.log(`   Appointment: ${appointment.id}`);
    console.log(`   Payment: ${payment.id}`);
    console.log(`   Blog: ${blogPost.id}`);
    console.log(`   FAQ: ${faq.id}`);
    console.log(`   Landing Page: ${landingPage.id}`);
    console.log(`   Scholarship: ${scholarship.id}`);
    console.log(`   Message Log: ${messageLog.id}`);
    console.log(`   File Upload: ${fileUpload.id}`);
    console.log(`   Student Notification: ${studentNotification.id}`);
    console.log(`   Class Booking Request: ${classBookingRequest.id}`);
    console.log(`   Test Assignment: ${testAssignment.id}`);
    console.log(`   Service Booking Request: ${serviceBookingRequest.id}`);
    console.log(`   Visa Document: ${visaDocument.id}`);
    console.log(`   Commission: ${commission.id}`);
    console.log(`   Notification: ${notification.id}`);
    console.log(`   Activity Log: ${activityLog.id}`);
    console.log(`   SMS Template: ${smsTemplate.id}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

seedFirstTenantData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
