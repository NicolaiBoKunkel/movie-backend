// Global test teardown
// This file runs after all tests

module.exports = async () => {
  // Close any open database connections
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Ignore errors during disconnect
  }

  // Close any remaining database pool connections
  try {
    const { pool } = require('../../src/db/pool');
    if (pool && pool.end) {
      await pool.end();
    }
  } catch (error) {
    // Ignore errors during pool cleanup
  }

  // Allow time for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
};
