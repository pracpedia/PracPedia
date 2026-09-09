// Clean seed script — creates ONLY one super admin account.
// No demo subjects, folders, images, bookings, or portfolio items.
//
// ⚠️  TEST MODE: password is stored as PLAINTEXT (no bcrypt).
import { db } from '../src/lib/db';

async function hashPassword(password: string): Promise<string> {
  return password; // plaintext — test mode only
}

async function main() {
  console.log('🧹 Wiping all existing data...');

  await db.activityLog.deleteMany();
  await db.portfolioItem.deleteMany();
  await db.booking.deleteMany();
  await db.chatMessage.deleteMany();
  await db.hireRequest.deleteMany();
  await db.announcement.deleteMany();
  await db.folder.deleteMany();
  await db.subject.deleteMany();
  await db.user.deleteMany();

  console.log('✓ All data wiped');
  console.log('👤 Creating super admin...');

  const adminPassword = await hashPassword('pracpedia123456789');

  const superAdmin = await db.user.create({
    data: {
      id: 'u-admin',
      email: 'pracpedia@gmail.com',
      name: 'PracPedia Super Admin',
      passwordHash: adminPassword,
      role: 'super_admin',
      bio: 'PracPedia platform super administrator.',
      isPremium: true,
    },
  });

  console.log('✅ Seed complete!');
  console.log(`   Super Admin: ${superAdmin.email} / pracpedia123456789`);
  console.log('');
  console.log('   No subjects, folders, images, or demo users were created.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
