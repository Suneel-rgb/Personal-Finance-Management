import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// 1. Resolve raw database URL from all possible environment sources and strip outer quotes
let rawDbUrl = (
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_PRISMA_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  ""
)
  .trim()
  .replace(/^["']|["']$/g, "")
  .trim();

// Normalize postgres:// to postgresql://
if (rawDbUrl.startsWith("postgres://")) {
  rawDbUrl = rawDbUrl.replace("postgres://", "postgresql://");
}

// 2. Inspect active provider of the compiled Prisma Client engine
const dummyClient = new PrismaClient();
const activeProvider =
  ((dummyClient as unknown as { _engineConfig?: { activeProvider?: string } })._engineConfig
    ?.activeProvider) || "sqlite";

let resolvedUrl = "";

if (activeProvider === "postgresql") {
  // If Prisma was compiled for PostgreSQL, ensure we supply a valid postgresql:// URL
  resolvedUrl = rawDbUrl.startsWith("postgresql://")
    ? rawDbUrl
    : "postgresql://postgres:postgres@localhost:5432/finance";
} else {
  // Active provider is SQLite
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const tmpDir = process.env.TEMP || process.env.TMP || "/tmp";
    const tmpDbPath = path.join(tmpDir, "dev.db");
    const templateDbPath = path.join(process.cwd(), "prisma", "template.db");
    const cwdDbPath = path.join(process.cwd(), "prisma", "dev.db");

    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ tmpDir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ tmpDir, { recursive: true });
      }

      if (!fs.existsSync(/*turbopackIgnore: true*/ tmpDbPath)) {
        if (fs.existsSync(/*turbopackIgnore: true*/ templateDbPath)) {
          fs.copyFileSync(templateDbPath, tmpDbPath);
        } else if (fs.existsSync(/*turbopackIgnore: true*/ cwdDbPath)) {
          fs.copyFileSync(cwdDbPath, tmpDbPath);
        }
      }

      if (fs.existsSync(/*turbopackIgnore: true*/ tmpDbPath)) {
        try {
          fs.chmodSync(tmpDbPath, 0o666);
        } catch {
          // ignore chmod errors on systems that don't support it
        }
        resolvedUrl = `file:${tmpDbPath}`;
      } else {
        resolvedUrl = `file:${cwdDbPath}`;
      }
    } catch (err) {
      console.error("[prisma] Serverless tmp db init warning:", err);
      resolvedUrl = `file:${cwdDbPath}`;
    }
  } else {
    // Local / development environment
    if (rawDbUrl.startsWith("file:")) {
      resolvedUrl = rawDbUrl;
    } else if (rawDbUrl.endsWith(".db")) {
      resolvedUrl = `file:${rawDbUrl.startsWith("./") ? rawDbUrl : `./${rawDbUrl}`}`;
    } else {
      resolvedUrl = "file:./dev.db";
    }
  }
}

// Ensure process.env.DATABASE_URL is also updated to the sanitized valid URL
process.env.DATABASE_URL = resolvedUrl;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
