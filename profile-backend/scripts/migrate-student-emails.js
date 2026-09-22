const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  const user = process.env.MYSQL_USER || 'lascstudent';
  const pass = process.env.MYSQL_PASSWORD_URLENCODED || 'lascstudent%21';
  const port = process.env.MYSQL_PORT || '3307';
  const db = process.env.MYSQL_DATABASE || 'lascstudent';
  process.env.DATABASE_URL = `mysql://${user}:${pass}@localhost:${port}/${db}`;
}

const prisma = require('../prismaClient');

async function main() {
  console.log('🔄 Starting student email migration...');

  const students = await prisma.user.findMany({
    where: { role: 'student' },
    select: { id: true, username: true, email: true }
  });

  console.log(`Found ${students.length} students in users table.`);

  let updatedCount = 0;
  let alreadyCorrectCount = 0;
  const updates = [];

  for (const s of students) {
    const targetEmail = `stu${s.username}@sskru.ac.th`;
    if (s.email !== targetEmail) {
      updates.push(
        prisma.user.update({
          where: { id: s.id },
          data: { email: targetEmail }
        })
      );
      updatedCount++;
    } else {
      alreadyCorrectCount++;
    }
  }

  // Execute in batches of 200
  const BATCH_SIZE = 200;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(batch);
    console.log(`Progress: ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length} updated...`);
  }

  console.log('✅ Migration completed successfully!');
  console.log(`- Updated: ${updatedCount} students`);
  console.log(`- Already in correct format: ${alreadyCorrectCount} students`);

  // Verify
  const remainingOld = await prisma.user.count({
    where: {
      role: 'student',
      email: { contains: '@student.sskru.ac.th' }
    }
  });
  console.log(`- Remaining old format emails: ${remainingOld}`);

  const sampleUpdated = await prisma.user.findMany({
    where: { role: 'student' },
    take: 5,
    select: { id: true, username: true, email: true }
  });
  console.log('Sample updated student accounts:', sampleUpdated);
}

main()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
