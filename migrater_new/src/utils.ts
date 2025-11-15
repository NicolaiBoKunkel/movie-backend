import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Utility functions for the movie migrator
 */

export class MigratorUtils {
  
  /**
   * Get database statistics for migration planning
   */
  static async getDatabaseStats() {
    try {
      const stats = {
        mediaItems: await prisma.mediaItem.count(),
        movies: await prisma.movie.count(),
        tvShows: await prisma.tVShow.count(),
        persons: await prisma.person.count(),
        actors: await prisma.actor.count(),
        crewMembers: await prisma.crewMember.count(),
        companies: await prisma.company.count(),
        genres: await prisma.genre.count(),
        collections: await prisma.collection.count(),
        titleCastings: await prisma.titleCasting.count(),
        titleCrewAssignments: await prisma.titleCrewAssignment.count(),
        seasons: await prisma.season.count(),
        episodes: await prisma.episode.count(),
        episodeCastings: await prisma.episodeCasting.count(),
        episodeCrewAssignments: await prisma.episodeCrewAssignment.count(),
      };

      console.log("Database Statistics:");
      console.log("===================");
      Object.entries(stats).forEach(([key, value]: [string, number]) => {
        console.log(`${key}: ${value.toLocaleString()}`);
      });

      return stats;
    } catch (error) {
      console.error("Error getting database stats:", error);
      throw error;
    }
  }

  /**
   * Validate data integrity before migration
   */
  static async validateDataIntegrity() {
    console.log("Validating data integrity...");
    
    const issues: string[] = [];

    try {
      // Check for orphaned movies (movies that should have corresponding media items)
      // This is mainly for data validation - in your schema this shouldn't happen due to foreign keys
      
      // Check for actors without persons (this also shouldn't happen due to foreign keys)
      // These checks are more for data integrity verification
      
      // Since your Prisma schema enforces relationships, we'll check for logical inconsistencies instead
      
      // Check for media items without movies or TV shows
      const mediaWithoutType = await prisma.mediaItem.count({
        where: {
          AND: [
            { movie: null },
            { tvShow: null }
          ]
        }
      });
      if (mediaWithoutType > 0) {
        issues.push(`Found ${mediaWithoutType} media items that are neither movies nor TV shows`);
      }

      // Check for persons without actor or crew roles
      const personsWithoutRoles = await prisma.person.count({
        where: {
          AND: [
            { actor: null },
            { crewMember: null }
          ]
        }
      });
      if (personsWithoutRoles > 0) {
        issues.push(`Found ${personsWithoutRoles} persons without actor or crew roles`);
      }

      if (issues.length === 0) {
        console.log("✅ Data integrity check passed!");
      } else {
        console.log("⚠️  Data integrity issues found:");
        issues.forEach((issue: string) => console.log(`  - ${issue}`));
      }

      return issues;
    } catch (error) {
      console.error("Error validating data integrity:", error);
      throw error;
    }
  }

  /**
   * Get sample data for testing migration logic
   */
  static async getSampleData(limit = 5) {
    try {
      const sampleData = {
        mediaItems: await prisma.mediaItem.findMany({
          take: limit,
          include: {
            movie: {
              include: {
                collection: true
              }
            },
            tvShow: {
              include: {
                seasons: {
                  include: {
                    episodes: true
                  }
                }
              }
            },
            mediaGenres: {
              include: {
                genre: true
              }
            },
            titleCastings: {
              include: {
                actor: {
                  include: {
                    person: true
                  }
                }
              }
            }
          }
        }),
        
        persons: await prisma.person.findMany({
          take: limit,
          include: {
            actor: {
              include: {
                titleCastings: {
                  include: {
                    mediaItem: true
                  }
                }
              }
            },
            crewMember: {
              include: {
                titleCrewAssignments: {
                  include: {
                    mediaItem: true
                  }
                }
              }
            }
          }
        })
      };

      console.log("Sample data retrieved successfully");
      return sampleData;
    } catch (error) {
      console.error("Error getting sample data:", error);
      throw error;
    }
  }

  /**
   * Test database connections
   */
  static async testConnections() {
    console.log("Testing database connections...");
    
    try {
      // Test Prisma/PostgreSQL connection
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ PostgreSQL (Prisma) connection successful");
      
      return true;
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      return false;
    }
  }
}

// If run directly, show database stats
if (require.main === module) {
  async function main() {
    await MigratorUtils.testConnections();
    await MigratorUtils.getDatabaseStats();
    await MigratorUtils.validateDataIntegrity();
    await prisma.$disconnect();
  }
  
  main().catch(console.error);
}