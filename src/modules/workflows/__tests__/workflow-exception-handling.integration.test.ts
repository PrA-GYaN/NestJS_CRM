import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { WorkflowsModule } from '../workflows.module';
import { TenantService } from '../../../common/tenant/tenant.service';
import {
  WorkflowNotFoundException,
  WorkflowStepOrderConflictException,
  WorkflowMinimumStepsException,
  WorkflowVersionNotFoundException,
  CompletedApplicationMigrationException,
  InvalidMigrationStrategyException,
  IncompatibleVersionMigrationException,
  WorkflowValidationException,
} from '../exceptions';
import {
  WorkflowOperationCode,
  WorkflowStepOperationCode,
  WorkflowVersionOperationCode,
  WorkflowMigrationOperationCode,
} from '../dto/workflow-error-codes';

describe('Workflow Exception Handling Integration Tests', () => {
  let app: INestApplication;
  let tenantService: TenantService;
  const tenantId = 'test-tenant-123';
  const invalidId = 'invalid-workflow-id';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WorkflowsModule],
      providers: [TenantService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    tenantService = moduleFixture.get<TenantService>(TenantService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Workflow Not Found Errors', () => {
    it('should return standardized error for missing workflow', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 404,
        code: WorkflowOperationCode.WORKFLOW_NOT_FOUND,
        error: {
          type: 'NOT_FOUND',
          code: WorkflowOperationCode.WORKFLOW_NOT_FOUND,
        },
        traceId: expect.any(String),
        timestamp: expect.any(String),
      });

      expect(response.body.error.suggestions).toBeDefined();
      expect(Array.isArray(response.body.error.suggestions)).toBe(true);
    });

    it('should include context in error response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      expect(response.body.error.context).toBeDefined();
      expect(response.body.error.context.resourceId).toBe(invalidId);
      expect(response.body.error.context.resourceType).toBe('workflow');
    });

    it('should include trace ID for debugging', async () => {
      const response1 = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      const response2 = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      // Trace IDs should be unique
      expect(response1.body.traceId).not.toEqual(response2.body.traceId);
    });
  });

  describe('Step Order Conflict Errors', () => {
    it('should return error for duplicate step order', async () => {
      // This would require creating a workflow first with a step at order 1
      // Then attempting to add another step at the same order
      const response = await request(app.getHttpServer())
        .post(`/workflows/test-workflow/steps`)
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Duplicate Step',
          stepOrder: 1, // Already exists
          description: 'This should fail',
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 409,
        code: WorkflowStepOperationCode.STEP_ORDER_CONFLICT,
        error: {
          type: 'CONFLICT',
        },
      });
    });

    it('should provide suggestions for resolving conflicts', async () => {
      const response = await request(app.getHttpServer())
        .post(`/workflows/test-workflow/steps`)
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Duplicate Step',
          stepOrder: 1,
          description: 'This should fail',
        })
        .expect(409);

      expect(response.body.error.suggestions).toBeDefined();
      expect(response.body.error.suggestions.length).toBeGreaterThan(0);
      expect(response.body.error.suggestions[0]).toMatch(/order|available/i);
    });
  });

  describe('Validation Errors', () => {
    it('should return field-level validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/workflows')
        .set('Authorization', 'Bearer token')
        .send({
          // Missing required fields
          name: '', // Empty name
          visaTypeId: '', // Empty visa type
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        error: {
          type: 'VALIDATION_ERROR',
        },
      });

      expect(response.body.error.validationErrors).toBeDefined();
      expect(Object.keys(response.body.error.validationErrors)).toContain('name');
      expect(Object.keys(response.body.error.validationErrors)).toContain('visaTypeId');
    });

    it('should provide specific validation error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/workflows')
        .set('Authorization', 'Bearer token')
        .send({
          name: '',
          visaTypeId: 'invalid',
        })
        .expect(400);

      const nameErrors = response.body.error.validationErrors.name;
      expect(Array.isArray(nameErrors)).toBe(true);
      expect(nameErrors[0]).toMatch(/required|empty|name/i);
    });
  });

  describe('Workflow Version Errors', () => {
    it('should return error for missing version', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflow-versions/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 404,
        code: WorkflowVersionOperationCode.VERSION_NOT_FOUND,
        error: {
          type: 'NOT_FOUND',
        },
      });
    });

    it('should return error for minimum steps requirement', async () => {
      const response = await request(app.getHttpServer())
        .post('/workflow-versions')
        .set('Authorization', 'Bearer token')
        .send({
          workflowId: 'test-workflow',
          steps: [], // Empty steps array
          changelog: 'New version',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        code: WorkflowVersionOperationCode.VERSION_MINIMUM_STEPS_REQUIRED,
        error: {
          type: 'VALIDATION_ERROR',
        },
      });

      expect(response.body.error.suggestions).toBeDefined();
      expect(response.body.error.suggestions[0]).toMatch(/at least.*step/i);
    });
  });

  describe('Migration Errors', () => {
    it('should prevent migration of completed applications', async () => {
      const response = await request(app.getHttpServer())
        .post('/workflow-versions/migrations/application')
        .set('Authorization', 'Bearer token')
        .send({
          applicationId: 'completed-app-id',
          toVersionId: 'new-version-id',
          strategy: 'ForcedUpdate',
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 409,
        code: WorkflowMigrationOperationCode.MIGRATION_APPLICATION_COMPLETED,
        error: {
          type: 'CONFLICT',
        },
      });

      expect(response.body.error.context.currentStatus).toBe('Approved');
    });

    it('should validate migration strategy requirements', async () => {
      const response = await request(app.getHttpServer())
        .post('/workflow-versions/migrations/application')
        .set('Authorization', 'Bearer token')
        .send({
          applicationId: 'app-id',
          toVersionId: 'version-id',
          strategy: 'RemapStep',
          // Missing targetStepId required for RemapStep
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        code: WorkflowMigrationOperationCode.MIGRATION_INVALID_STRATEGY,
        error: {
          type: 'VALIDATION_ERROR',
        },
      });

      expect(response.body.error.suggestions).toBeDefined();
    });

    it('should detect incompatible version migrations', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflow-versions/validate-mappings/from-version-id/to-version-id`)
        .set('Authorization', 'Bearer token')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        code: WorkflowMigrationOperationCode.MIGRATION_INCOMPATIBLE_VERSIONS,
        error: {
          type: 'CONFLICT',
        },
      });

      expect(response.body.error.context.incompatibleStepsCount).toBeGreaterThan(0);
    });
  });

  describe('Error Response Structure', () => {
    it('should always include required fields in error response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      const requiredFields = [
        'success',
        'statusCode',
        'message',
        'code',
        'data',
        'error',
        'traceId',
        'timestamp',
      ];

      requiredFields.forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });
    });

    it('should have consistent error object structure', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      const errorFields = ['code', 'message', 'type'];
      errorFields.forEach((field) => {
        expect(response.body.error).toHaveProperty(field);
      });
    });

    it('should return data: null for error responses', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      expect(response.body.data).toBeNull();
    });

    it('should provide documentation URL for certain errors', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      expect(response.body.error.docUrl).toBeDefined();
      expect(response.body.error.docUrl).toMatch(/^https?:\/\//);
    });
  });

  describe('Success Response Structure', () => {
    it('should wrap successful responses in envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/workflows')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        statusCode: 200,
        message: expect.any(String),
        code: expect.any(String),
        traceId: expect.any(String),
        timestamp: expect.any(String),
      });

      expect(response.body.data).toBeDefined();
      expect(response.body.error).toBeUndefined();
    });

    it('should include operation code in success response', async () => {
      const response = await request(app.getHttpServer())
        .get('/workflows')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(Object.values(WorkflowOperationCode)).toContain(response.body.code);
    });

    it('should handle pagination in list responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/workflows?page=1&limit=10')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(response.body.data).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
        totalPages: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
    });
  });

  describe('Error Code Consistency', () => {
    it('should use predefined error codes from enum', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      const allErrorCodes = Object.values(WorkflowOperationCode);
      expect(allErrorCodes).toContain(response.body.code);
    });

    it('should maintain consistent error type mapping', async () => {
      const notFoundResponse = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      expect(notFoundResponse.body.error.type).toBe('NOT_FOUND');
      expect(notFoundResponse.body.statusCode).toBe(404);
    });
  });

  describe('Error Logging', () => {
    it('should generate unique trace ID for each request', async () => {
      const traceIds = new Set();

      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .get(`/workflows/${invalidId}`)
          .set('Authorization', 'Bearer token')
          .expect(404);

        traceIds.add(response.body.traceId);
      }

      // All trace IDs should be unique
      expect(traceIds.size).toBe(5);
    });

    it('should include timestamp in ISO format', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workflows/${invalidId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);

      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
