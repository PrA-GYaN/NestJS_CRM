import { Test, TestingModule } from '@nestjs/testing';
import { CourseApplicationsController } from './course-applications.controller';
import { CourseApplicationsService } from './course-applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('CourseApplicationsController', () => {
  let controller: CourseApplicationsController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [CourseApplicationsController],
      providers: [
        {
          provide: CourseApplicationsService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<CourseApplicationsController>(CourseApplicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
