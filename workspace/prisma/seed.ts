// Seed script — populates the PracPedia database with demo data
//
// ⚠️  TEST MODE: passwords are stored as PLAINTEXT (no bcrypt). This is for
//     local development only — the super admin credentials viewer needs to
//     display plaintext passwords. Do not deploy this seed to production.
import { db } from '../src/lib/db';

// Plaintext password storage — no hashing in test mode.
async function hashPassword(password: string): Promise<string> {
  return password;
}

async function main() {
  console.log('🌱 Seeding PracPedia database...');

  // Wipe existing data
  await db.portfolioItem.deleteMany();
  await db.booking.deleteMany();
  await db.chatMessage.deleteMany();
  await db.hireRequest.deleteMany();
  await db.announcement.deleteMany();
  await db.folder.deleteMany();
  await db.subject.deleteMany();
  await db.user.deleteMany();

  // Seed Users — first admin is Super Admin
  const adminPassword = await hashPassword('admin123');
  const userPassword = await hashPassword('user123');
  const artistPassword = await hashPassword('artist123');

  const superAdmin = await db.user.create({
    data: {
      id: 'u-admin',
      email: 'admin@gallery.com',
      name: 'Professor Akash (Super Admin)',
      passwordHash: adminPassword,
      role: 'super_admin',
      studyTime: 2400,
      phoneNumber: '+8801711111111',
      bio: 'Lead faculty super administrator for the Practical Notebook Gallery. Oversees all platform operations, marketplace integrity, and curriculum standards.',
      isPremium: true,
      aiCredits: 9999,
    },
  });

  const secondaryAdmin = await db.user.create({
    data: {
      id: 'u-admin2',
      email: 'admin2@gallery.com',
      name: 'Dr. Sarah Chen (Admin)',
      passwordHash: adminPassword,
      role: 'admin',
      studyTime: 1800,
      phoneNumber: '+8801722222222',
      bio: 'Faculty administrator responsible for chemistry and biology curriculum oversight.',
      isPremium: true,
      aiCredits: 5000,
    },
  });

  const student = await db.user.create({
    data: {
      id: 'u-user',
      email: 'student@gallery.com',
      name: 'Mahabub Student',
      passwordHash: userPassword,
      role: 'user',
      studyTime: 420,
      phoneNumber: '+8801733333333',
      bio: 'Science student exploring practical notebooks and commissioning professional drawings.',
    },
  });

  // Demo artist with two-tier pricing
  const artist = await db.user.create({
    data: {
      id: 'u-artist',
      email: 'sajid@draw.com',
      name: 'Sajid Ahmed',
      passwordHash: artistPassword,
      role: 'artist',
      phoneNumber: '+8801744444444',
      bio: 'Professional STEM illustrator with 8+ years creating board-standard lab diagrams for Physics, Chemistry, Biology. Specialized in precision apparatus drawings and organic chemistry structural formulas.',
      profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sajid&backgroundColor=b6e3f4',
      rateDrawingOnly: 250,
      rateDrawingWriting: 550,
      specialtiesJson: JSON.stringify(['Physics', 'Chemistry', 'Biology', 'Higher Math']),
      isAvailable: true,
      rating: 4.9,
      completedOrders: 127,
      isPremium: true,
    },
  });

  const artist2 = await db.user.create({
    data: {
      id: 'u-artist2',
      email: 'nadia@draw.com',
      name: 'Nadia Rahman',
      passwordHash: artistPassword,
      role: 'artist',
      phoneNumber: '+8801755555555',
      bio: 'Award-winning scientific illustrator focused on biology dissection guides and microscopic observation plates. Anatomy and cytology specialist with publication-grade accuracy.',
      profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia&backgroundColor=ffdfbf',
      rateDrawingOnly: 200,
      rateDrawingWriting: 480,
      specialtiesJson: JSON.stringify(['Biology', 'Chemistry']),
      isAvailable: true,
      rating: 4.8,
      completedOrders: 89,
    },
  });

  const artist3 = await db.user.create({
    data: {
      id: 'u-artist3',
      email: 'tanvir@draw.com',
      name: 'Tanvir Islam',
      passwordHash: artistPassword,
      role: 'artist',
      phoneNumber: '+8801766666666',
      bio: 'ICT and Higher Math specialist. Creates clean logic gate schematics, circuit diagrams, and coordinate geometry plots with precision typography.',
      profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tanvir&backgroundColor=c0aede',
      rateDrawingOnly: 180,
      rateDrawingWriting: 420,
      specialtiesJson: JSON.stringify(['ICT', 'Higher Math', 'Physics']),
      isAvailable: false,
      rating: 4.7,
      completedOrders: 64,
    },
  });

  // Seed Subjects
  const subjects = [
    { id: 'sub-1', title: 'Physics', description: 'Mechanics, optics, waves, electrical, and nuclear physics notebooks.' },
    { id: 'sub-2', title: 'Chemistry', description: 'Acid-base titrations, salt analysis, organic compounds, and kinetics.' },
    { id: 'sub-3', title: 'Biology', description: 'Cytology slides, plant physiology, dissection guides, and specimen logs.' },
    { id: 'sub-4', title: 'Higher Math', description: 'Coordinate geometry plots, vector analysis, and functions graphing.' },
    { id: 'sub-5', title: 'ICT', description: 'HTML/CSS coding structures, logic gates truth tables, and database schemas.' },
  ];

  for (const s of subjects) {
    await db.subject.create({ data: s });
  }

  // Seed Folders with embedded images JSON
  const folders = [
    {
      id: 'fold-1',
      subjectId: 'sub-2',
      title: 'Practical 1: Acid-Base Titration',
      description: 'Determination of the strength of a supplied sodium hydroxide solution with standard oxalic acid solution.',
      imagesJson: JSON.stringify([
        { url: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&q=80&w=1200', title: 'Titration Setup & Indicators' },
        { url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=1200', title: 'Endpoint Concordant Readings Table' },
      ]),
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
    },
    {
      id: 'fold-2',
      subjectId: 'sub-1',
      title: 'Practical 1: Slide Caliper Measurements',
      description: 'Determination of the volume of a solid cylinder using a slide caliper.',
      imagesJson: JSON.stringify([
        { url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=1200', title: 'Vernier Constant & Error Calc' },
      ]),
      createdAt: new Date('2026-05-20T00:00:00.000Z'),
    },
    {
      id: 'fold-3',
      subjectId: 'sub-3',
      title: 'Practical 1: Plant Cell Plasmolysis',
      description: 'Observation of plasmolysis and deplasmolysis in epidermal peels of Rhoeo discolor leaves.',
      imagesJson: JSON.stringify([
        { url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=1200', title: 'Microscopic Plasmodesmata Observation' },
      ]),
      createdAt: new Date('2026-05-25T00:00:00.000Z'),
    },
    {
      id: 'fold-4',
      subjectId: 'sub-5',
      title: 'Practical 1: Logic Gates Realization',
      description: 'Verification of truth tables of basic OR, AND, and NOT logic gates.',
      imagesJson: JSON.stringify([
        { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200', title: 'Breadboard Logic Gate Wiring Diagram' },
      ]),
      createdAt: new Date('2026-05-28T00:00:00.000Z'),
    },
  ];

  for (const f of folders) {
    await db.folder.create({ data: f });
  }

  // Seed an announcement
  await db.announcement.create({
    data: {
      title: 'Welcome to PracPedia Practical Notebook Gallery',
      content: 'All students must complete their first practical notebook submission by next Friday. Check the dashboard portal for new folders added weekly. The new Marketplace now offers Drawing Only and Drawing + Writing service tiers from professional STEM illustrators.',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdById: superAdmin.id,
      createdByName: superAdmin.name,
    },
  });

  // Seed portfolio items for artists
  const portfolioItems = [
    // Sajid's portfolio
    {
      artistId: 'u-artist',
      imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&q=80&w=800',
      title: 'Titration Apparatus — Full Setup',
      description: 'Professional board-standard chemistry titration diagram with burette, pipette, conical flask, and indicator color transitions.',
      tagsJson: JSON.stringify(['Chemistry', 'Titration', 'Apparatus']),
    },
    {
      artistId: 'u-artist',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800',
      title: 'Vernier Caliper Reading Diagram',
      description: 'Precision physics measurement diagram with vernier scale reading technique and main scale alignment.',
      tagsJson: JSON.stringify(['Physics', 'Measurement']),
    },
    {
      artistId: 'u-artist',
      imageUrl: 'https://images.unsplash.com/photo-1635070041075-2d45c1b2da21?auto=format&fit=crop&q=80&w=800',
      title: 'Organic Chemistry Structural Formulas',
      description: 'Hand-drawn organic chemistry structures with proper bond angles, hybridization, and 3D conformational representations.',
      tagsJson: JSON.stringify(['Chemistry', 'Organic']),
    },
    {
      artistId: 'u-artist',
      imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc73ac3f4?auto=format&fit=crop&q=80&w=800',
      title: 'Optics Ray Diagram Set',
      description: 'Complete optics ray diagrams for convex lens, concave lens, mirrors, with proper focal point markings.',
      tagsJson: JSON.stringify(['Physics', 'Optics']),
    },
    // Nadia's portfolio
    {
      artistId: 'u-artist2',
      imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=800',
      title: 'Plant Cell Plasmolysis Stages',
      description: 'Detailed microscopic observation diagram showing plasmolysis stages in Rhoeo discolor epidermal cells.',
      tagsJson: JSON.stringify(['Biology', 'Cytology']),
    },
    {
      artistId: 'u-artist2',
      imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1f13931325?auto=format&fit=crop&q=80&w=800',
      title: 'Human Heart Dissection Guide',
      description: 'Anatomically precise heart dissection plate with chambers, valves, and major vessels labeled.',
      tagsJson: JSON.stringify(['Biology', 'Dissection']),
    },
    {
      artistId: 'u-artist2',
      imageUrl: 'https://images.unsplash.com/photo-1554475769-17cfca8f6d6a?auto=format&fit=crop&q=80&w=800',
      title: 'Photosynthesis Process Diagram',
      description: 'Complete photosynthesis diagram with light reactions, Calvin cycle, and chloroplast structure.',
      tagsJson: JSON.stringify(['Biology', 'Botany']),
    },
    // Tanvir's portfolio
    {
      artistId: 'u-artist3',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
      title: 'Logic Gate Truth Tables',
      description: 'Clean truth table layouts for AND, OR, NOT, NAND, NOR, XOR gates with circuit symbols.',
      tagsJson: JSON.stringify(['ICT', 'Logic']),
    },
    {
      artistId: 'u-artist3',
      imageUrl: 'https://images.unsplash.com/photo-1635070041075-2d45c1b2da21?auto=format&fit=crop&q=80&w=800',
      title: 'Coordinate Geometry Plots',
      description: 'Precise coordinate geometry function plots with axes, scales, and intersection points marked.',
      tagsJson: JSON.stringify(['Higher Math', 'Geometry']),
    },
  ];

  for (const p of portfolioItems) {
    await db.portfolioItem.create({ data: p });
  }

  // Seed a sample booking (student → artist, drawing only)
  await db.booking.create({
    data: {
      id: 'book-demo-1',
      clientId: 'u-user',
      artistId: 'u-artist',
      serviceType: 'drawing_only',
      subject: 'Chemistry',
      description: 'Need a board-standard titration apparatus diagram with all labels, indicator color transitions, and a clean readings table for my practical notebook.',
      price: 250,
      status: 'in_progress',
      paymentStatus: 'paid',
    },
  });

  console.log('✅ Seed complete!');
  console.log(`   Super Admin:  ${superAdmin.email} / admin123  (role: ${superAdmin.role})`);
  console.log(`   Admin:        ${secondaryAdmin.email} / admin123  (role: ${secondaryAdmin.role})`);
  console.log(`   Student:      ${student.email} / user123`);
  console.log(`   Artist 1:     ${artist.email} / artist123  (Drawing: ${artist.rateDrawingOnly} BDT, Drawing+Writing: ${artist.rateDrawingWriting} BDT)`);
  console.log(`   Artist 2:     ${artist2.email} / artist123`);
  console.log(`   Artist 3:     ${artist3.email} / artist123  (unavailable)`);
  console.log(`   Portfolio:    ${portfolioItems.length} items seeded`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
