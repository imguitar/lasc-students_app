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
  const oldEmails = await prisma.user.findMany({
    where: {
      role: 'student',
      email: { contains: '@student.sskru.ac.th' }
    },
    select: { id: true, username: true, email: true }
  });
  console.log('Old format student emails count:', oldEmails.length);
  if (oldEmails.length > 0) {
    console.log('Sample old emails:', oldEmails.slice(0, 5));
  }

  const newEmails = await prisma.user.findMany({
    where: {
      role: 'student',
      email: { contains: '@sskru.ac.th', not: { contains: '@student.sskru.ac.th' } }
    },
    select: { id: true, username: true, email: true }
  });
  console.log('New format or other @sskru.ac.th count:', newEmails.length);
  if (newEmails.length > 0) {
    console.log('Sample new emails:', newEmails.slice(0, 5));
  }

  const allStudents = await prisma.user.count({ where: { role: 'student' } });
  console.log('Total students in users table:', allStudents);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
