import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance. This is a small, low-traffic
// personal service (2 users) so a single connection/client is plenty —
// no need for connection pooling gymnastics.
export const prisma = new PrismaClient();
