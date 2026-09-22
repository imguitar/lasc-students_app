const prisma = require('../prismaClient');

async function main() {
  console.log('Creating news_events table if not exists...');
  const sql = `
    CREATE TABLE IF NOT EXISTS \`news_events\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`title\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NOT NULL,
      \`type\` VARCHAR(100) NOT NULL,
      \`event_date\` DATE NOT NULL,
      \`start_time\` VARCHAR(20) NULL,
      \`end_time\` VARCHAR(20) NULL,
      \`location\` VARCHAR(255) NULL,
      \`image_url\` VARCHAR(500) NULL,
      \`attachment_url\` VARCHAR(500) NULL,
      \`is_pinned\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`is_published\` BOOLEAN NOT NULL DEFAULT TRUE,
      \`created_by\` INT NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`idx_news_events_date\` (\`event_date\`),
      INDEX \`idx_news_events_type\` (\`type\`),
      INDEX \`idx_news_events_published\` (\`is_published\`),
      CONSTRAINT \`news_events_created_by_fkey\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;

  await prisma.$executeRawUnsafe(sql);
  console.log('✅ Table news_events created successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Error creating table:', err);
  process.exit(1);
});
