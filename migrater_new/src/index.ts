import "dotenv/config";
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import MigrateToMongo from "./MigrateToMongo";
import MigrateToNeo4j from "./MigrateToNeo4j";

const prisma = new PrismaClient();

async function runMigrations() {
  try {
    console.log("Starting movie database migrations...");
    
    // Test Prisma connection
    await prisma.$connect();
    console.log("Connected to PostgreSQL database via Prisma!");

    // Run MongoDB migration
    try {
      await MigrateToMongo(prisma);
      console.log("MongoDB migration completed successfully!");
    } catch (error) {
      console.error("Error migrating to MongoDB:", error);
      console.log("Skipping MongoDB migration - ensure MongoDB is running and accessible");
    }

    // Run Neo4j migration
    try {
      await MigrateToNeo4j(prisma);
      console.log("Neo4j migration completed successfully!");
    } catch (error) {
      console.error("Error migrating to Neo4j:", error);
      console.log("Skipping Neo4j migration - ensure Neo4j is running and accessible");
    }

    console.log("All migrations completed!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runMigrations();