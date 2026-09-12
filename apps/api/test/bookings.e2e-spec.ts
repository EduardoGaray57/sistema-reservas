import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * Full booking flow against the real Postgres test DB.
 * 2026-09-10 is a Thursday (dayOfWeek 4); 2026-09-11 is a Friday (dayOfWeek 5).
 * The resource timezone is America/Argentina/Buenos_Aires (UTC-3, no DST):
 * local 10:00 → 13:00Z, local 11:00 → 14:00Z.
 */
describe('Bookings API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let resourceId: string;
  const date = '2026-09-11'; // Friday — matches the Friday schedule below
  const startTime = `${date}T13:00:00.000Z`; // local 10:00

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Resource + schedule: local 10:00–11:00 (Friday), 60-min slots.
    const res = await request(app.getHttpServer())
      .post('/api/resources')
      .send({ name: 'E2E Booking Room', slotDurationMinutes: 60 })
      .expect(201);
    resourceId = res.body.id;

    await prisma.schedule.create({
      data: {
        resourceId,
        dayOfWeek: 5,
        startTime: '10:00',
        endTime: '11:00',
      },
    });
  });

  afterAll(async () => {
    await prisma.resource.deleteMany({ where: { id: { in: [resourceId] } } });
    await app.close();
  });

  it('GET availability → slot is available before booking', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/resources/${resourceId}/availability?date=${date}`)
      .expect(200);

    expect(res.body.slots).toEqual([
      expect.objectContaining({
        startTime,
        endTime: `${date}T14:00:00.000Z`,
        available: true,
      }),
    ]);
  });

  it('POST /api/bookings → 201 CONFIRMED, emails are mocked out (no SMTP/Resend needed)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/bookings')
      .send({
        resourceId,
        startTime,
        guestName: 'Alice E2E',
        guestEmail: 'alice@example.com',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      resourceId,
      startTime,
      guestName: 'Alice E2E',
      guestEmail: 'alice@example.com',
      status: 'CONFIRMED',
    });
  });

  it('POST same slot again → 409 (double booking rejected)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/bookings')
      .send({
        resourceId,
        startTime,
        guestName: 'Bob E2E',
        guestEmail: 'bob@example.com',
      })
      .expect(409);

    expect(res.body).toMatchObject({ statusCode: 409 });
    expect(res.body.message).toContain('not available');
  });

  it('GET availability → slot is now shown as taken', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/resources/${resourceId}/availability?date=${date}`)
      .expect(200);

    expect(res.body.slots[0].available).toBe(false);
  });

  it('GET /api/bookings?resourceId&date → lists the booking', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/bookings?resourceId=${resourceId}&date=${date}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ resourceId, status: 'CONFIRMED' });
  });

  it('PATCH /api/bookings/:id/cancel → 200 CANCELLED, slot frees up', async () => {
    const list = await request(app.getHttpServer())
      .get(`/api/bookings?resourceId=${resourceId}&date=${date}`)
      .expect(200);
    const bookingId = list.body[0].id;

    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/bookings/${bookingId}/cancel`)
      .expect(200);
    expect(cancelRes.body.status).toBe('CANCELLED');

    const avail = await request(app.getHttpServer())
      .get(`/api/resources/${resourceId}/availability?date=${date}`)
      .expect(200);
    expect(avail.body.slots[0].available).toBe(true);
  });

  it('re-booking a cancelled slot → 201 (partial unique index only blocks CONFIRMED)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/bookings')
      .send({
        resourceId,
        startTime,
        guestName: 'Carol E2E',
        guestEmail: 'carol@example.com',
      })
      .expect(201);

    expect(res.body.status).toBe('CONFIRMED');
  });

  it('POST /api/bookings → 400 for invalid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/bookings')
      .send({ resourceId })
      .expect(400);

    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  it('POST /api/bookings → 404 for unknown resource', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/bookings')
      .send({
        resourceId: 'nonexistent-id',
        startTime,
        guestName: 'David E2E',
        guestEmail: 'david@example.com',
      })
      .expect(404);

    expect(res.body).toMatchObject({ statusCode: 404 });
  });
});