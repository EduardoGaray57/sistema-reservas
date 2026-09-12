import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Resources API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // NestFactory-style init so the global ValidationPipe + exception filter apply.
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Cascade removes schedules, bookings and blocked times for test resources.
    await prisma.resource.deleteMany({ where: { id: { in: createdIds } } });
    await app.close();
  });

  it('POST /api/resources → 201 with defaults', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resources')
      .send({ name: 'E2E Meeting Room' })
      .expect(201);

    expect(res.body).toMatchObject({
      name: 'E2E Meeting Room',
      slotDurationMinutes: 30,
    });
    expect(typeof res.body.id).toBe('string');
    createdIds.push(res.body.id);
  });

  it('POST /api/resources → 400 for an empty body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resources')
      .send({})
      .expect(400);

    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  it('GET /api/resources → 200 array containing the created resource', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/resources')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((r: { id: string }) => createdIds.includes(r.id))).toBe(true);
  });

  it('GET /api/resources/:id → 200 for existing, 404 for unknown', async () => {
    await request(app.getHttpServer())
      .get(`/api/resources/${createdIds[0]}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/resources/nonexistent-id')
      .expect(404);
    expect(res.body).toMatchObject({ statusCode: 404 });
  });

  it('PATCH /api/resources/:id → 200 with partial update', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/resources/${createdIds[0]}`)
      .send({ description: 'Updated by e2e' })
      .expect(200);

    expect(res.body.description).toBe('Updated by e2e');
    expect(res.body.name).toBe('E2E Meeting Room');
  });

  it('DELETE /api/resources/:id → 204, then GET → 404', async () => {
    await request(app.getHttpServer())
      .delete(`/api/resources/${createdIds[0]}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/resources/${createdIds[0]}`)
      .expect(404);
  });

  it('GET availability → 400 when the date query parameter is missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/resources/nonexistent-id/availability')
      .expect(400);

    expect(res.body.message).toContain('date query parameter is required');
  });
});