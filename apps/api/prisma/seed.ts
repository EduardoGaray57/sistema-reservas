import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds the database with 2 sample resources and their weekly schedules.
 * Idempotent: skips a resource if one with the same name already exists.
 */
async function main(): Promise<void> {
  const seeds = [
    {
      name: "Cozy Corner Restaurant",
      description: "Intimate 12-seat restaurant with dinner service.",
      slotDurationMinutes: 60,
      timezone: "America/Argentina/Buenos_Aires",
      schedules: [
        { dayOfWeek: 1, startTime: "19:00", endTime: "23:00" }, // Monday
        { dayOfWeek: 2, startTime: "19:00", endTime: "23:00" }, // Tuesday
        { dayOfWeek: 3, startTime: "19:00", endTime: "23:00" }, // Wednesday
        { dayOfWeek: 4, startTime: "19:00", endTime: "23:00" }, // Thursday
        { dayOfWeek: 5, startTime: "19:00", endTime: "23:30" }, // Friday
        { dayOfWeek: 6, startTime: "19:00", endTime: "23:30" }, // Saturday
      ],
    },
    {
      name: "Meeting Room A",
      description: "Bookable meeting room for up to 8 people, full day.",
      slotDurationMinutes: 30,
      timezone: "America/Argentina/Buenos_Aires",
      schedules: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }, // Monday
        { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" }, // Tuesday
        { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" }, // Wednesday
        { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" }, // Thursday
        { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" }, // Friday
      ],
    },
  ];

  let created = 0;

  for (const seed of seeds) {
    const existing = await prisma.resource.findFirst({
      where: { name: seed.name },
    });

    if (existing) {
      // eslint-disable-next-line no-console
      console.log(`Seed: resource "${seed.name}" already exists — skipping`);
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`Seed: creating resource "${seed.name}"`);
    await prisma.resource.create({
      data: {
        name: seed.name,
        description: seed.description,
        slotDurationMinutes: seed.slotDurationMinutes,
        timezone: seed.timezone,
        schedules: {
          create: seed.schedules,
        },
      },
    });
    created += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Seed: done — ${created} resource(s) created`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });