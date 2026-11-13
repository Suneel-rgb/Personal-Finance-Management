const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('[prepare-prisma] Schema not found at:', schemaPath);
  process.exit(0);
}

// 1. Resolve database URL from environment variables
let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || '';

// 2. Fallback to reading .env file if DATABASE_URL is not in process.env
if (!dbUrl && fs.existsSync(path.join(__dirname, '..', '.env'))) {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        dbUrl = trimmed.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  } catch (err) {
    console.warn('[prepare-prisma] Could not parse .env:', err.message);
  }
}

// 3. Determine provider
if (dbUrl.startsWith('postgres://')) {
  process.env.DATABASE_URL = dbUrl.replace('postgres://', 'postgresql://');
  dbUrl = process.env.DATABASE_URL;
}

const isPostgres = dbUrl.startsWith('postgresql://');

let schema = fs.readFileSync(schemaPath, 'utf8');

if (isPostgres) {
  console.log('[prepare-prisma] Detected PostgreSQL DATABASE_URL. Configuring provider = "postgresql"...');
  if (schema.includes('provider = "sqlite"')) {
    schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('[prepare-prisma] Updated schema.prisma provider to "postgresql".');
  } else {
    console.log('[prepare-prisma] schema.prisma provider is already "postgresql".');
  }
} else {
  console.log('[prepare-prisma] Detected SQLite or local environment. Configuring provider = "sqlite"...');
  if (schema.includes('provider = "postgresql"')) {
    schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('[prepare-prisma] Updated schema.prisma provider to "sqlite".');
  } else {
    console.log('[prepare-prisma] schema.prisma provider is already "sqlite".');
  }
}
