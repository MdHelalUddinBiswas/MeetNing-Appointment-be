// Prisma client singleton for serverless environments
const { PrismaClient } = require('@prisma/client');

// Use a global variable to cache the Prisma instance across function invocations
const globalForPrisma = global;

// Check if PrismaClient is already in global to avoid multiple instances in development
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
}

// Export the Prisma client instance
module.exports = globalForPrisma.prisma;