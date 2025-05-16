// Prisma client singleton for serverless environments
const { PrismaClient } = require('@prisma/client');

// Use a global variable to cache the Prisma instance across function invocations
const globalForPrisma = global;

// Create the Prisma client instance once and reuse it
const prisma = globalForPrisma.prisma || new PrismaClient();

// Save the instance in development (hot reloading will create new connections otherwise)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
