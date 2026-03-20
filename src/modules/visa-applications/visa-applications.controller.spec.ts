import { Test, TestingModule } from '@nestjs/testing';
import { VisaApplicationsController } from './visa-applications.controller';

describe('VisaApplicationsController', () => {
  let controller: VisaApplicationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisaApplicationsController],
    }).compile();

    controller = module.get<VisaApplicationsController>(VisaApplicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
