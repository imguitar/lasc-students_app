const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Load environment variables manually to prioritize .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const nodeEnv = process.env.NODE_ENV || 'development';
const dbUrl = process.env.DATABASE_URL || '';

// Hide password if dbUrl is present for logging purposes
function maskUrl(url) {
  if (!url) return 'Empty or undefined';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch (e) {
    return 'Invalid URL format';
  }
}

// Safer check: Parse URL and check hostname instead of raw string include
let isProductionDB = false;
let dbHostname = '';

if (dbUrl) {
  try {
    const parsedUrl = new URL(dbUrl);
    dbHostname = parsedUrl.hostname.toLowerCase();
    
    // Check specific known production hosts
    if (
      dbHostname.includes('railway.internal') ||
      dbHostname.includes('railway.app') ||
      dbHostname.includes('rds.amazonaws.com')
    ) {
      isProductionDB = true;
    }
  } catch (err) {
    // If it's an invalid URL, we can't reliably parse it.
    // For safety, we will let it fail later in Prisma, but won't falsely classify it as Prod.
  }
} else {
  // Empty DATABASE_URL
  console.warn('⚠️ WARNING: DATABASE_URL is empty or undefined. Safety check skipped (Prisma will likely fail).');
}

const scriptArgs = process.env.npm_lifecycle_event || '';

// 1. Prevent Development or Test environment from pointing to Production Database
if ((nodeEnv === 'development' || nodeEnv === 'test') && isProductionDB) {
  console.error('\n======================================================');
  console.error('❌ ERROR: UNSAFE DATABASE OPERATION PREVENTED ❌');
  console.error('======================================================');
  console.error(`Environment:   ${nodeEnv}`);
  console.error(`Database Host: ${dbHostname} (Detected as Production)`);
  console.error(`Connection:    ${maskUrl(dbUrl)}`);
  console.error(`\nReason: You are in a ${nodeEnv.toUpperCase()} environment, but your DATABASE_URL`);
  console.error('is pointing to a PRODUCTION database (e.g. Railway).');
  console.error('Action Required: Please change DATABASE_URL in your .env to a local/test database.');
  console.error('Example: mysql://lascstudent:lascstudent%21@localhost:3306/lascstudent');
  console.error('======================================================\n');
  process.exit(1);
}

// 2. Prevent destructive commands against Production Database
const destructiveCommands = ['db:push', 'db:reset', 'db:dev', 'db:seed', 'db:seed:departments'];
const isDestructive = destructiveCommands.some(cmd => scriptArgs.includes(cmd));

if (isProductionDB && isDestructive) {
    console.error('\n======================================================');
    console.error('❌ ERROR: UNSAFE PRISMA COMMAND PREVENTED ❌');
    console.error('======================================================');
    console.error(`Environment:   ${nodeEnv}`);
    console.error(`Database Host: ${dbHostname}`);
    console.error(`Command:       npm run ${scriptArgs}`);
    console.error('\nBLOCKED: This database command cannot run against the production database.');
    console.error('Action Required: Use `npm run db:deploy` for production schema updates.');
    console.error('======================================================\n');
    process.exit(1);
}

console.log('✅ Database safety check passed.');
