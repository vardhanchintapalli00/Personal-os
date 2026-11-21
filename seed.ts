import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedDemoData } from '../src/lib/demo';

const prisma = new PrismaClient();

function todayIST() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

async function main() {
  const email = 'vardhan@lifeos.app';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Vardhan Chintapalli',
      passwordHash: await bcrypt.hash('lifeos1234', 10),
      age: 21,
      location: 'Kukatpally, Telangana, India',
      heightCm: 175,
      weightKg: 72.6,
      targetWeightKg: 68,
      fitnessGoal: 'Lose fat',
      activityLevel: 'Moderate',
      goals: ['Crack campus placements', 'Get fit', 'Save for a laptop'],
      onboarded: true,
      notifications: { tasks: true, water: true, workout: true, budget: true, habits: true },
    },
  });
  await seedDemoData(prisma, user.id, todayIST());
  console.log(`Seeded demo account: ${email} / lifeos1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
