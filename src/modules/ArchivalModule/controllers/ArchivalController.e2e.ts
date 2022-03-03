import supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { ArchivalModule } from '@/modules/ArchivalModule/ArchivalModule';
import { INestApplication } from '@nestjs/common';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ArchivalModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return supertest(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });
});
