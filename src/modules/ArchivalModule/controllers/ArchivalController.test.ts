import { Test, TestingModule } from '@nestjs/testing';
import { ArchivalController } from '@/modules/ArchivalModule/controllers/ArchivalController';
import { ArchivalService } from '@/modules/ArchivalModule/services/ArchivalService';

describe('ArchivalController', () => {
  let Archival: TestingModule;

  beforeAll(async () => {
    Archival = await Test.createTestingModule({
      controllers: [ArchivalController],
      providers: [ArchivalService]
    }).compile();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      const archivalController = Archival.get<ArchivalController>(ArchivalController);
    });
  });
});
