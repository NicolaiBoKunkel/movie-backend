import { PrismaClient } from "@prisma/client";
import Neo4jConnection from "./neo4jConnection";

const MigrateToNeo4j = async (prisma: PrismaClient) => {
  console.log("Starting Neo4j migration...");
  
  const neo4j = new Neo4jConnection();
  
  try {
    const session = await neo4j.connect();

    // Clear existing data
    console.log("Clearing existing Neo4j data...");
    await session.run("MATCH (n) DETACH DELETE n");

    // Create constraints and indexes
    console.log("Creating constraints and indexes...");
    
    const constraints = [
      "CREATE CONSTRAINT media_id_unique IF NOT EXISTS FOR (m:MediaItem) REQUIRE m.mediaId IS UNIQUE",
      "CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.personId IS UNIQUE", 
      "CREATE CONSTRAINT company_id_unique IF NOT EXISTS FOR (c:Company) REQUIRE c.companyId IS UNIQUE",
      "CREATE CONSTRAINT genre_id_unique IF NOT EXISTS FOR (g:Genre) REQUIRE g.genreId IS UNIQUE",
      "CREATE CONSTRAINT collection_id_unique IF NOT EXISTS FOR (col:Collection) REQUIRE col.collectionId IS UNIQUE",
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
      } catch (error) {
        console.log(`Constraint might already exist: ${constraint}`);
      }
    }

    // Migrate Genres
    console.log("Migrating genres to Neo4j...");
    const genres = await prisma.genre.findMany();
    
    for (const genre of genres) {
      await session.run(
        `CREATE (g:Genre {
          genreId: $genreId,
          name: $name
        })`,
        {
          genreId: genre.genreId.toString(),
          name: genre.name
        }
      );
    }
    console.log(`Migrated ${genres.length} genres`);

    // Migrate Companies
    console.log("Migrating companies to Neo4j...");
    const companies = await prisma.company.findMany();
    
    for (const company of companies) {
      await session.run(
        `CREATE (c:Company {
          companyId: $companyId,
          tmdbId: $tmdbId,
          name: $name,
          originCountry: $originCountry,
          description: $description,
          logoPath: $logoPath
        })`,
        {
          companyId: company.companyId.toString(),
          tmdbId: company.tmdbId?.toString(),
          name: company.name,
          originCountry: company.originCountry,
          description: company.description,
          logoPath: company.logoPath
        }
      );
    }
    console.log(`Migrated ${companies.length} companies`);

    // Migrate Collections
    console.log("Migrating collections to Neo4j...");
    const collections = await prisma.collection.findMany();
    
    for (const collection of collections) {
      await session.run(
        `CREATE (col:Collection {
          collectionId: $collectionId,
          tmdbId: $tmdbId,
          name: $name,
          overview: $overview,
          posterPath: $posterPath,
          backdropPath: $backdropPath
        })`,
        {
          collectionId: collection.collectionId.toString(),
          tmdbId: collection.tmdbId?.toString(),
          name: collection.name,
          overview: collection.overview,
          posterPath: collection.posterPath,
          backdropPath: collection.backdropPath
        }
      );
    }
    console.log(`Migrated ${collections.length} collections`);

    // Migrate Persons
    console.log("Migrating persons to Neo4j...");
    const persons = await prisma.person.findMany({
      include: {
        actor: true,
        crewMember: true
      }
    });
    
    for (const person of persons) {
      const labels = ["Person"];
      if (person.actor) labels.push("Actor");
      if (person.crewMember) labels.push("CrewMember");
      
      await session.run(
        `CREATE (p:${labels.join(":")} {
          personId: $personId,
          tmdbId: $tmdbId,
          name: $name,
          gender: $gender,
          biography: $biography,
          birthDate: $birthDate,
          deathDate: $deathDate,
          placeOfBirth: $placeOfBirth,
          profilePath: $profilePath,
          actingDebutYear: $actingDebutYear,
          primaryDepartment: $primaryDepartment
        })`,
        {
          personId: person.personId.toString(),
          tmdbId: person.tmdbId?.toString() || null,
          name: person.name,
          gender: person.gender || null,
          biography: person.biography || null,
          birthDate: person.birthDate?.toISOString() || null,
          deathDate: person.deathDate?.toISOString() || null,
          placeOfBirth: person.placeOfBirth || null,
          profilePath: person.profilePath || null,
          actingDebutYear: person.actor?.actingDebutYear || null,
          primaryDepartment: person.crewMember?.primaryDepartment || null
        }
      );
    }
    console.log(`Migrated ${persons.length} persons`);

    // Migrate Media Items (Movies and TV Shows)
    console.log("Migrating media items to Neo4j...");
    const mediaItems = await prisma.mediaItem.findMany({
      include: {
        movie: {
          include: {
            collection: true
          }
        },
        tvShow: true
      }
    });
    
    for (const item of mediaItems) {
      const labels = ["MediaItem"];
      if (item.movie) labels.push("Movie");
      if (item.tvShow) labels.push("TVShow");
      
      const properties: any = {
        mediaId: item.mediaId.toString(),
        tmdbId: item.tmdbId?.toString(),
        mediaType: item.mediaType,
        originalTitle: item.originalTitle,
        overview: item.overview,
        originalLanguage: item.originalLanguage,
        status: item.status,
        popularity: parseFloat(item.popularity.toString()),
        voteAverage: parseFloat(item.voteAverage.toString()),
        voteCount: item.voteCount,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        homepageUrl: item.homepageUrl
      };

      // Add movie-specific properties
      if (item.movie) {
        properties.releaseDate = item.movie.releaseDate?.toISOString() || null;
        properties.budget = item.movie.budget.toString();
        properties.revenue = item.movie.revenue.toString();
        properties.adultFlag = item.movie.adultFlag;
        properties.runtimeMinutes = item.movie.runtimeMinutes || null;
      }

      // Add TV show-specific properties
      if (item.tvShow) {
        properties.firstAirDate = item.tvShow.firstAirDate?.toISOString() || null;
        properties.lastAirDate = item.tvShow.lastAirDate?.toISOString() || null;
        properties.inProduction = item.tvShow.inProduction;
        properties.numberOfSeasons = item.tvShow.numberOfSeasons;
        properties.numberOfEpisodes = item.tvShow.numberOfEpisodes;
        properties.showType = item.tvShow.showType || null;
      }

      await session.run(
        `CREATE (m:${labels.join(":")} $properties)`,
        { properties }
      );

      // Create relationship to collection for movies
      if (item.movie?.collectionId) {
        await session.run(
          `MATCH (m:MediaItem {mediaId: $mediaId})
           MATCH (col:Collection {collectionId: $collectionId})
           CREATE (m)-[:PART_OF]->(col)`,
          {
            mediaId: item.mediaId.toString(),
            collectionId: item.movie.collectionId.toString()
          }
        );
      }
    }
    console.log(`Migrated ${mediaItems.length} media items`);

    // Migrate Seasons and Episodes for TV Shows
    console.log("Migrating seasons to Neo4j...");
    const seasons = await prisma.season.findMany({
      include: {
        tvShow: {
          include: {
            mediaItem: true
          }
        }
      }
    });
    
    for (const season of seasons) {
      await session.run(
        `CREATE (s:Season {
          seasonId: $seasonId,
          seasonNumber: $seasonNumber,
          name: $name,
          airDate: $airDate,
          episodeCount: $episodeCount,
          overview: $overview,
          posterPath: $posterPath
        })`,
        {
          seasonId: season.seasonId.toString(),
          seasonNumber: season.seasonNumber,
          name: season.name,
          airDate: season.airDate?.toISOString() || null,
          episodeCount: season.episodeCount,
          overview: null,
          posterPath: season.posterPath || null
        }
      );

      // Create relationship between TV show and season
      await session.run(
        `MATCH (tv:MediaItem {mediaId: $mediaId})
         MATCH (s:Season {seasonId: $seasonId})
         CREATE (tv)-[:HAS_SEASON]->(s)`,
        {
          mediaId: season.tvShow.mediaItem.mediaId.toString(),
          seasonId: season.seasonId.toString()
        }
      );
    }
    console.log(`Migrated ${seasons.length} seasons`);

    // Migrate Episodes
    console.log("Migrating episodes to Neo4j...");
    const episodes = await prisma.episode.findMany({
      include: {
        season: true
      }
    });
    
    for (const episode of episodes) {
      await session.run(
        `CREATE (e:Episode {
          episodeId: $episodeId,
          episodeNumber: $episodeNumber,
          name: $name,
          airDate: $airDate,
          runtimeMinutes: $runtimeMinutes,
          overview: $overview,
          stillPath: $stillPath,
          voteAverage: $voteAverage,
          voteCount: $voteCount
        })`,
        {
          episodeId: episode.episodeId.toString(),
          episodeNumber: episode.episodeNumber,
          name: episode.name,
          airDate: episode.airDate?.toISOString() || null,
          runtimeMinutes: episode.runtimeMinutes || null,
          overview: episode.overview || null,
          stillPath: episode.stillPath || null,
          voteAverage: null,
          voteCount: null
        }
      );

      // Create relationship between season and episode
      await session.run(
        `MATCH (s:Season {seasonId: $seasonId})
         MATCH (e:Episode {episodeId: $episodeId})
         CREATE (s)-[:HAS_EPISODE]->(e)`,
        {
          seasonId: episode.season.seasonId.toString(),
          episodeId: episode.episodeId.toString()
        }
      );
    }
    console.log(`Migrated ${episodes.length} episodes`);

    // Create relationships between Media Items and Genres
    console.log("Creating media-genre relationships...");
    const mediaGenres = await prisma.mediaGenre.findMany();
    
    for (const mg of mediaGenres) {
      await session.run(
        `MATCH (m:MediaItem {mediaId: $mediaId})
         MATCH (g:Genre {genreId: $genreId})
         CREATE (m)-[:HAS_GENRE]->(g)`,
        {
          mediaId: mg.mediaId.toString(),
          genreId: mg.genreId.toString()
        }
      );
    }
    console.log(`Created ${mediaGenres.length} media-genre relationships`);

    // Create relationships between Media Items and Companies
    console.log("Creating media-company relationships...");
    const mediaCompanies = await prisma.mediaCompany.findMany();
    
    for (const mc of mediaCompanies) {
      await session.run(
        `MATCH (m:MediaItem {mediaId: $mediaId})
         MATCH (c:Company {companyId: $companyId})
         CREATE (m)-[:PRODUCED_BY {role: $role}]->(c)`,
        {
          mediaId: mc.mediaId.toString(),
          companyId: mc.companyId.toString(),
          role: mc.role
        }
      );
    }
    console.log(`Created ${mediaCompanies.length} media-company relationships`);

    // Create acting relationships
    console.log("Creating acting relationships...");
    const titleCastings = await prisma.titleCasting.findMany();
    
    for (const tc of titleCastings) {
      await session.run(
        `MATCH (p:Person {personId: $personId})
         MATCH (m:MediaItem {mediaId: $mediaId})
         CREATE (p)-[:ACTED_IN {
           characterName: $characterName,
           castOrder: $castOrder
         }]->(m)`,
        {
          personId: tc.personId.toString(),
          mediaId: tc.mediaId.toString(),
          characterName: tc.characterName,
          castOrder: tc.castOrder
        }
      );
    }
    console.log(`Created ${titleCastings.length} acting relationships`);

    // Create crew relationships
    console.log("Creating crew relationships...");
    const crewAssignments = await prisma.titleCrewAssignment.findMany();
    
    for (const tca of crewAssignments) {
      await session.run(
        `MATCH (p:Person {personId: $personId})
         MATCH (m:MediaItem {mediaId: $mediaId})
         CREATE (p)-[:WORKED_ON {
           department: $department,
           jobTitle: $jobTitle
         }]->(m)`,
        {
          personId: tca.personId.toString(),
          mediaId: tca.mediaId.toString(),
          department: tca.department,
          jobTitle: tca.jobTitle
        }
      );
    }
    console.log(`Created ${crewAssignments.length} crew relationships`);

    // Create episode acting relationships
    console.log("Creating episode acting relationships...");
    const episodeCastings = await prisma.episodeCasting.findMany();
    
    for (const ec of episodeCastings) {
      await session.run(
        `MATCH (p:Person {personId: $personId})
         MATCH (e:Episode {episodeId: $episodeId})
         CREATE (p)-[:ACTED_IN_EPISODE {
           characterName: $characterName,
           castOrder: $castOrder
         }]->(e)`,
        {
          personId: ec.personId.toString(),
          episodeId: ec.episodeId.toString(),
          characterName: ec.characterName,
          castOrder: ec.castOrder
        }
      );
    }
    console.log(`Created ${episodeCastings.length} episode acting relationships`);

    // Create episode crew relationships
    console.log("Creating episode crew relationships...");
    const episodeCrewAssignments = await prisma.episodeCrewAssignment.findMany();
    
    for (const eca of episodeCrewAssignments) {
      await session.run(
        `MATCH (p:Person {personId: $personId})
         MATCH (e:Episode {episodeId: $episodeId})
         CREATE (p)-[:WORKED_ON_EPISODE {
           department: $department,
           jobTitle: $jobTitle
         }]->(e)`,
        {
          personId: eca.personId.toString(),
          episodeId: eca.episodeId.toString(),
          department: eca.department,
          jobTitle: eca.jobTitle
        }
      );
    }
    console.log(`Created ${episodeCrewAssignments.length} episode crew relationships`);

    console.log("Neo4j migration completed successfully!");

  } catch (error) {
    console.error("Neo4j migration error:", error);
    throw error;
  } finally {
    await neo4j.disconnect();
  }
};

export default MigrateToNeo4j;