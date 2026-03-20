import { Test, TestingModule } from '@nestjs/testing';
import { VisaApplicationsService } from './visa-applications.service';

describe('VisaApplicationsService', () => {
  let service: VisaApplicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaApplicationsService],
    }).compile();

    service = module.get<VisaApplicationsService>(VisaApplicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
