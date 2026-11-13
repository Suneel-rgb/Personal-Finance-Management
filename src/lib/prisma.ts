import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// In Vercel serverless environments, root filesystem is read-only.
// We auto-mount the database in the writable /tmp directory.
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const tmpDbPath = path.join("/tmp", "dev.db");
  const templateDbPath = path.join(process.cwd(), "prisma", "template.db");
  const cwdDbPath = path.join(process.cwd(), "prisma", "dev.db");

  if (!fs.existsSync(tmpDbPath)) {
    if (fs.existsSync(templateDbPath)) {
      try {
        fs.copyFileSync(templateDbPath, tmpDbPath);
      } catch (err) {
        console.error("Failed to copy template.db to /tmp/dev.db:", err);
      }
    } else if (fs.existsSync(cwdDbPath)) {
      try {
        fs.copyFileSync(cwdDbPath, tmpDbPath);
      } catch (err) {
        console.error("Failed to copy dev.db to /tmp/dev.db:", err);
      }
    }
  }

  // Set DATABASE_URL to writable /tmp path unless an external database is configured
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
    process.env.DATABASE_URL = `file:${tmpDbPath}`;
  }
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

