// Clean seed script — creates ONLY one super admin account.
// No demo subjects, folders, images, bookings, or portfolio items.
// The user will create all content themselves after first login.
//
// ⚠️  TEST MODE: password is stored as PLAINTEXT (no bcrypt).
import { db } from '../src/lib/db';

async function hashPassword(password: string): Promise<string> {
  return password; // plaintext — test mode only
}

async function main() {
  console.log('🧹 Wiping all existing data...');

  // Delete in dependency order (children first)
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

  console.log('👤 Creating single super admin...');

  const adminPassword = await hashPassword('admin123');

  const superAdmin = await db.user.create({
    data: {
      id: 'u-admin',
      email: 'admin@gallery.com',
      name: 'Super Admin',
      passwordHash: adminPassword,
      role: 'super_admin',
      bio: 'Platform super administrator.',
      isPremium: true,
    },
  });

  console.log('✅ Seed complete!');
  console.log(`   Super Admin: ${superAdmin.email} / admin123`);
  console.log('');
  console.log('   No subjects, folders, images, or demo users were created.');
  console.log('   Log in and create everything yourself.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
