import { PrismaClient } from "@prisma/client";
import MongoDataSource, { CollectionsDataSource } from "./mongoDataSource";
import { MediaItemMongo } from "./entities/mongo/MediaItemMongo";
import { MovieMongo } from "./entities/mongo/MovieMongo";
import { TVShowMongo } from "./entities/mongo/TVShowMongo";
import { PersonMongo } from "./entities/mongo/PersonMongo";
import { CompanyMongo } from "./entities/mongo/CompanyMongo";
import { GenreMongo } from "./entities/mongo/GenreMongo";
import { SeasonMongo } from "./entities/mongo/SeasonMongo";
import { EpisodeMongo } from "./entities/mongo/EpisodeMongo";
import { ActorMongo } from "./entities/mongo/ActorMongo";
import { CrewMemberMongo } from "./entities/mongo/CrewMemberMongo";
import { CollectionMongo } from "./entities/mongo/CollectionMongo";
import { MediaGenreMongo } from "./entities/mongo/MediaGenreMongo";
import { MediaCompanyMongo } from "./entities/mongo/MediaCompanyMongo";
import { TitleCastingMongo } from "./entities/mongo/TitleCastingMongo";
import { EpisodeCastingMongo } from "./entities/mongo/EpisodeCastingMongo";
import { TitleCrewAssignmentMongo } from "./entities/mongo/TitleCrewAssignmentMongo";
import { EpisodeCrewAssignmentMongo } from "./entities/mongo/EpisodeCrewAssignmentMongo";

const MigrateToMongo = async (prisma: PrismaClient) => {
  console.log("Starting MongoDB migration...");

  try {
    await MongoDataSource.initialize();
    console.log("Connected to MongoDB!");

    // Get repositories for all entities
    const mediaItemRepo = MongoDataSource.getMongoRepository(MediaItemMongo);
    const movieRepo = MongoDataSource.getMongoRepository(MovieMongo);
    const tvShowRepo = MongoDataSource.getMongoRepository(TVShowMongo);
    const personRepo = MongoDataSource.getMongoRepository(PersonMongo);
    const companyRepo = MongoDataSource.getMongoRepository(CompanyMongo);
    const genreRepo = MongoDataSource.getMongoRepository(GenreMongo);
    const seasonRepo = MongoDataSource.getMongoRepository(SeasonMongo);
    const episodeRepo = MongoDataSource.getMongoRepository(EpisodeMongo);
    const actorRepo = MongoDataSource.getMongoRepository(ActorMongo);
    const crewMemberRepo = MongoDataSource.getMongoRepository(CrewMemberMongo);
    const collectionRepo = MongoDataSource.getMongoRepository(CollectionMongo);
    const mediaGenreRepo = MongoDataSource.getMongoRepository(MediaGenreMongo);
    const mediaCompanyRepo = MongoDataSource.getMongoRepository(MediaCompanyMongo);
    const titleCastingRepo = MongoDataSource.getMongoRepository(TitleCastingMongo);
    const episodeCastingRepo = MongoDataSource.getMongoRepository(EpisodeCastingMongo);
    const titleCrewAssignmentRepo = MongoDataSource.getMongoRepository(TitleCrewAssignmentMongo);
    const episodeCrewAssignmentRepo = MongoDataSource.getMongoRepository(EpisodeCrewAssignmentMongo);

    // Clear existing data from all collections
    await mediaItemRepo.deleteMany({});
    await movieRepo.deleteMany({});
    await tvShowRepo.deleteMany({});
    await personRepo.deleteMany({});
    await companyRepo.deleteMany({});
    await genreRepo.deleteMany({});
    await seasonRepo.deleteMany({});
    await episodeRepo.deleteMany({});
    await actorRepo.deleteMany({});
    await crewMemberRepo.deleteMany({});
    await collectionRepo.deleteMany({});
    await mediaGenreRepo.deleteMany({});
    await mediaCompanyRepo.deleteMany({});
    await titleCastingRepo.deleteMany({});
    await episodeCastingRepo.deleteMany({});
    await titleCrewAssignmentRepo.deleteMany({});
    await episodeCrewAssignmentRepo.deleteMany({});

    console.log("Cleared existing MongoDB collections");

    // Migrate fully nested MediaItems to separate 'collections' database
    console.log("\nMigrating fully nested MediaItems to 'collections' database...");
    await migrateFullyNestedMediaItems(prisma);

    // Migrate Genres
    console.log("Migrating genres...");
    const genres = await prisma.genre.findMany({
      include: {
        mediaGenres: {
          include: {
            mediaItem: true
          }
        }
      }
    });

    const genreDocs = genres.map((genre: any) => ({
      genreId: genre.genreId.toString(),
      name: genre.name,
      mediaItems: genre.mediaGenres.map((mg: any) => ({
        mediaId: mg.mediaItem.mediaId.toString(),
        title: mg.mediaItem.originalTitle,
        mediaType: mg.mediaItem.mediaType
      }))
    }));

    await genreRepo.insertMany(genreDocs);
    console.log(`Migrated ${genreDocs.length} genres`);

    // Migrate Collections
    console.log("Migrating collections...");
    const collections = await prisma.collection.findMany({
      include: {
        movies: {
          include: {
            mediaItem: true
          }
        }
      }
    });

    const collectionDocs = collections.map((collection: any) => ({
      collectionId: collection.collectionId.toString(),
      tmdbId: collection.tmdbId?.toString(),
      name: collection.name,
      overview: collection.overview,
      posterPath: collection.posterPath,
      backdropPath: collection.backdropPath,
      movies: collection.movies.map((movie: any) => ({
        mediaId: movie.mediaItem.mediaId.toString(),
        title: movie.mediaItem.originalTitle
      }))
    }));

    if (collectionDocs.length > 0) {
      await collectionRepo.insertMany(collectionDocs);
    }
    console.log(`Migrated ${collectionDocs.length} collections`);

    // Migrate MediaGenres as separate documents
    console.log("Migrating media-genre relationships...");
    const mediaGenres = await prisma.mediaGenre.findMany({
      include: {
        mediaItem: true,
        genre: true
      }
    });

    const mediaGenreDocs = mediaGenres.map((mg: any) => ({
      mediaId: mg.mediaItem.mediaId.toString(),
      genreId: mg.genre.genreId.toString(),
      mediaTitle: mg.mediaItem.originalTitle,
      genreName: mg.genre.name,
      mediaType: mg.mediaItem.mediaType
    }));

    if (mediaGenreDocs.length > 0) {
      await mediaGenreRepo.insertMany(mediaGenreDocs);
    }
    console.log(`Migrated ${mediaGenreDocs.length} media-genre relationships`);

    // Migrate MediaCompanies as separate documents
    console.log("Migrating media-company relationships...");
    const mediaCompaniesData = await prisma.mediaCompany.findMany({
      include: {
        mediaItem: true,
        company: true
      }
    });

    const mediaCompanyDocs = mediaCompaniesData.map((mc: any) => ({
      mediaId: mc.mediaItem.mediaId.toString(),
      companyId: mc.company.companyId.toString(),
      role: mc.role,
      mediaTitle: mc.mediaItem.originalTitle,
      companyName: mc.company.name,
      mediaType: mc.mediaItem.mediaType
    }));

    if (mediaCompanyDocs.length > 0) {
      await mediaCompanyRepo.insertMany(mediaCompanyDocs);
    }
    console.log(`Migrated ${mediaCompanyDocs.length} media-company relationships`);

    // Migrate Companies
    console.log("Migrating companies...");
    const companies = await prisma.company.findMany({
      include: {
        mediaCompanies: {
          include: {
            mediaItem: true
          }
        }
      }
    });

    const companyDocs = companies.map((company: any) => ({
      companyId: company.companyId.toString(),
      tmdbId: company.tmdbId?.toString(),
      name: company.name,
      originCountry: company.originCountry,
      description: company.description,
      logoPath: company.logoPath,
      mediaItems: company.mediaCompanies.map((mc: any) => ({
        mediaId: mc.mediaItem.mediaId.toString(),
        title: mc.mediaItem.originalTitle,
        role: mc.role,
        mediaType: mc.mediaItem.mediaType
      }))
    }));

    await companyRepo.insertMany(companyDocs);
    console.log(`Migrated ${companyDocs.length} companies`);

    // Migrate Persons (Actors and Crew)
    console.log("Migrating persons...");
    const persons = await prisma.person.findMany({
      include: {
        actor: {
          include: {
            titleCastings: {
              include: {
                mediaItem: true
              }
            },
            episodeCastings: {
              include: {
                episode: {
                  include: {
                    season: {
                      include: {
                        tvShow: {
                          include: {
                            mediaItem: true
                          }
                        }
                      }
                    }
                  }
                }
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
            },
            episodeCrewAssignments: {
              include: {
                episode: {
                  include: {
                    season: {
                      include: {
                        tvShow: {
                          include: {
                            mediaItem: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const personDocs = persons.map((person: any) => ({
      personId: person.personId.toString(),
      tmdbId: person.tmdbId?.toString(),
      name: person.name,
      gender: person.gender,
      biography: person.biography,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      placeOfBirth: person.placeOfBirth,
      profilePath: person.profilePath,
      actingDebutYear: person.actor?.actingDebutYear,
      primaryDepartment: person.crewMember?.primaryDepartment,
      actingRoles: [
        ...(person.actor?.titleCastings?.map((tc: any) => ({
          mediaId: tc.mediaItem.mediaId.toString(),
          title: tc.mediaItem.originalTitle,
          characterName: tc.characterName,
          castOrder: tc.castOrder,
          mediaType: tc.mediaItem.mediaType
        })) || []),
        ...(person.actor?.episodeCastings?.map((ec: any) => ({
          episodeId: ec.episode.episodeId.toString(),
          episodeName: ec.episode.name,
          characterName: ec.characterName,
          castOrder: ec.castOrder,
          showTitle: ec.episode.season.tvShow.mediaItem.originalTitle
        })) || [])
      ],
      crewRoles: [
        ...(person.crewMember?.titleCrewAssignments?.map((tca: any) => ({
          mediaId: tca.mediaItem.mediaId.toString(),
          title: tca.mediaItem.originalTitle,
          department: tca.department,
          jobTitle: tca.jobTitle,
          mediaType: tca.mediaItem.mediaType
        })) || []),
        ...(person.crewMember?.episodeCrewAssignments?.map((eca: any) => ({
          episodeId: eca.episode.episodeId.toString(),
          episodeName: eca.episode.name,
          department: eca.department,
          jobTitle: eca.jobTitle,
          showTitle: eca.episode.season.tvShow.mediaItem.originalTitle
        })) || [])
      ]
    }));

    await personRepo.insertMany(personDocs);
    console.log(`Migrated ${personDocs.length} persons`);

    // Migrate Actors as separate documents
    console.log("Migrating actors...");
    const actors = await prisma.actor.findMany({
      include: {
        person: true,
        titleCastings: {
          include: {
            mediaItem: true
          }
        },
        episodeCastings: {
          include: {
            episode: {
              include: {
                season: {
                  include: {
                    tvShow: {
                      include: {
                        mediaItem: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const actorDocs = actors.map((actor: any) => ({
      actorId: actor.personId.toString(),
      personId: actor.person.personId.toString(),
      actingDebutYear: actor.actingDebutYear,
      personName: actor.person.name,
      titleRoles: actor.titleCastings.map((tc: any) => ({
        mediaId: tc.mediaItem.mediaId.toString(),
        title: tc.mediaItem.originalTitle,
        characterName: tc.characterName,
        castOrder: tc.castOrder
      })),
      episodeRoles: actor.episodeCastings.map((ec: any) => ({
        episodeId: ec.episode.episodeId.toString(),
        episodeName: ec.episode.name,
        characterName: ec.characterName,
        castOrder: ec.castOrder,
        showTitle: ec.episode.season.tvShow.mediaItem.originalTitle
      }))
    }));

    if (actorDocs.length > 0) {
      await actorRepo.insertMany(actorDocs);
    }
    console.log(`Migrated ${actorDocs.length} actors`);

    // Migrate CrewMembers as separate documents
    console.log("Migrating crew members...");
    const crewMembers = await prisma.crewMember.findMany({
      include: {
        person: true,
        titleCrewAssignments: {
          include: {
            mediaItem: true
          }
        },
        episodeCrewAssignments: {
          include: {
            episode: {
              include: {
                season: {
                  include: {
                    tvShow: {
                      include: {
                        mediaItem: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const crewMemberDocs = crewMembers.map((crew: any) => ({
      crewMemberId: crew.personId.toString(),
      personId: crew.person.personId.toString(),
      primaryDepartment: crew.primaryDepartment,
      personName: crew.person.name,
      titleAssignments: crew.titleCrewAssignments.map((tca: any) => ({
        mediaId: tca.mediaItem.mediaId.toString(),
        title: tca.mediaItem.originalTitle,
        department: tca.department,
        jobTitle: tca.jobTitle
      })),
      episodeAssignments: crew.episodeCrewAssignments.map((eca: any) => ({
        episodeId: eca.episode.episodeId.toString(),
        episodeName: eca.episode.name,
        department: eca.department,
        jobTitle: eca.jobTitle,
        showTitle: eca.episode.season.tvShow.mediaItem.originalTitle
      }))
    }));

    if (crewMemberDocs.length > 0) {
      await crewMemberRepo.insertMany(crewMemberDocs);
    }
    console.log(`Migrated ${crewMemberDocs.length} crew members`);

    // Migrate Media Items
    console.log("Migrating media items...");
    const mediaItems = await prisma.mediaItem.findMany({
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
                episodes: {
                  include: {
                    episodeCastings: {
                      include: {
                        actor: {
                          include: {
                            person: true
                          }
                        }
                      }
                    },
                    episodeCrewAssignments: {
                      include: {
                        crewMember: {
                          include: {
                            person: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        mediaGenres: {
          include: {
            genre: true
          }
        },
        mediaCompanies: {
          include: {
            company: true
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
        },
        titleCrewAssignments: {
          include: {
            crewMember: {
              include: {
                person: true
              }
            }
          }
        }
      }
    });

    const mediaItemDocs = mediaItems.map((item: any) => ({
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
      homepageUrl: item.homepageUrl,
      movie: item.movie ? {
        releaseDate: item.movie.releaseDate,
        budget: item.movie.budget.toString(),
        revenue: item.movie.revenue.toString(),
        adultFlag: item.movie.adultFlag,
        runtimeMinutes: item.movie.runtimeMinutes,
        collection: item.movie.collection ? {
          collectionId: item.movie.collection.collectionId.toString(),
          name: item.movie.collection.name,
          overview: item.movie.collection.overview
        } : null
      } : null,
      tvShow: item.tvShow ? {
        firstAirDate: item.tvShow.firstAirDate,
        lastAirDate: item.tvShow.lastAirDate,
        inProduction: item.tvShow.inProduction,
        numberOfSeasons: item.tvShow.numberOfSeasons,
        numberOfEpisodes: item.tvShow.numberOfEpisodes,
        showType: item.tvShow.showType,
        seasons: item.tvShow.seasons.map((season: any) => ({
          seasonId: season.seasonId.toString(),
          seasonNumber: season.seasonNumber,
          name: season.name,
          airDate: season.airDate,
          episodeCount: season.episodeCount,
          episodes: season.episodes.map((episode: any) => ({
            episodeId: episode.episodeId.toString(),
            episodeNumber: episode.episodeNumber,
            name: episode.name,
            airDate: episode.airDate,
            runtimeMinutes: episode.runtimeMinutes,
            overview: episode.overview,
            cast: episode.episodeCastings.map((ec: any) => ({
              personId: ec.actor.person.personId.toString(),
              name: ec.actor.person.name,
              characterName: ec.characterName,
              castOrder: ec.castOrder
            })),
            crew: episode.episodeCrewAssignments.map((eca: any) => ({
              personId: eca.crewMember.person.personId.toString(),
              name: eca.crewMember.person.name,
              department: eca.department,
              jobTitle: eca.jobTitle
            }))
          }))
        }))
      } : null,
      genres: item.mediaGenres.map((mg: any) => ({
        genreId: mg.genre.genreId.toString(),
        name: mg.genre.name
      })),
      companies: item.mediaCompanies.map((mc: any) => ({
        companyId: mc.company.companyId.toString(),
        name: mc.company.name,
        role: mc.role
      })),
      cast: item.titleCastings.map((tc: any) => ({
        personId: tc.actor.person.personId.toString(),
        name: tc.actor.person.name,
        characterName: tc.characterName,
        castOrder: tc.castOrder
      })),
      crew: item.titleCrewAssignments.map((tca: any) => ({
        personId: tca.crewMember.person.personId.toString(),
        name: tca.crewMember.person.name,
        department: tca.department,
        jobTitle: tca.jobTitle
      }))
    }));

    await mediaItemRepo.insertMany(mediaItemDocs);
    console.log(`Migrated ${mediaItemDocs.length} media items`);

    // Create specific movie and TV show documents for easier querying
    const movieDocs = mediaItemDocs
      .filter((item: any) => item.mediaType === 'movie' && item.movie)
      .map((item: any) => ({
        mediaId: item.mediaId,
        releaseDate: item.movie!.releaseDate,
        budget: parseInt(item.movie!.budget),
        revenue: parseInt(item.movie!.revenue),
        adultFlag: item.movie!.adultFlag,
        runtimeMinutes: item.movie!.runtimeMinutes,
        collectionId: item.movie!.collection?.collectionId,
        collection: item.movie!.collection,
        mediaItem: item
      }));

    if (movieDocs.length > 0) {
      await movieRepo.insertMany(movieDocs);
      console.log(`Migrated ${movieDocs.length} movies`);
    }

    const tvShowDocs = mediaItemDocs
      .filter((item: any) => item.mediaType === 'tv' && item.tvShow)
      .map((item: any) => ({
        mediaId: item.mediaId,
        firstAirDate: item.tvShow!.firstAirDate,
        lastAirDate: item.tvShow!.lastAirDate,
        inProduction: item.tvShow!.inProduction,
        numberOfSeasons: item.tvShow!.numberOfSeasons,
        numberOfEpisodes: item.tvShow!.numberOfEpisodes,
        showType: item.tvShow!.showType,
        seasons: item.tvShow!.seasons,
        mediaItem: item
      }));

    if (tvShowDocs.length > 0) {
      await tvShowRepo.insertMany(tvShowDocs);
      console.log(`Migrated ${tvShowDocs.length} TV shows`);
    }

    // Migrate Seasons as separate documents
    console.log("Migrating seasons...");
    const seasons = await prisma.season.findMany({
      include: {
        tvShow: {
          include: {
            mediaItem: true
          }
        },
        episodes: true
      }
    });

    const seasonDocs = seasons.map((season: any) => ({
      seasonId: season.seasonId.toString(),
      tvShowId: season.tvShow.mediaId.toString(),
      mediaId: season.tvShow.mediaItem.mediaId.toString(),
      seasonNumber: season.seasonNumber,
      name: season.name,
      airDate: season.airDate,
      episodeCount: season.episodeCount,
      overview: season.overview,
      posterPath: season.posterPath,
      showTitle: season.tvShow.mediaItem.originalTitle,
      episodeIds: season.episodes.map((ep: any) => ep.episodeId.toString())
    }));

    if (seasonDocs.length > 0) {
      await seasonRepo.insertMany(seasonDocs);
    }
    console.log(`Migrated ${seasonDocs.length} seasons`);

    // Migrate Episodes as separate documents
    console.log("Migrating episodes...");
    const episodes = await prisma.episode.findMany({
      include: {
        season: {
          include: {
            tvShow: {
              include: {
                mediaItem: true
              }
            }
          }
        }
      }
    });

    const episodeDocs = episodes.map((episode: any) => ({
      episodeId: episode.episodeId.toString(),
      seasonId: episode.season.seasonId.toString(),
      episodeNumber: episode.episodeNumber,
      name: episode.name,
      airDate: episode.airDate,
      runtimeMinutes: episode.runtimeMinutes,
      overview: episode.overview,
      stillPath: episode.stillPath,
      voteAverage: episode.voteAverage ? parseFloat(episode.voteAverage.toString()) : null,
      voteCount: episode.voteCount,
      seasonNumber: episode.season.seasonNumber,
      showTitle: episode.season.tvShow.mediaItem.originalTitle
    }));

    if (episodeDocs.length > 0) {
      await episodeRepo.insertMany(episodeDocs);
    }
    console.log(`Migrated ${episodeDocs.length} episodes`);

    // Migrate Title Castings as separate documents
    console.log("Migrating title castings...");
    const titleCastings = await prisma.titleCasting.findMany({
      include: {
        actor: {
          include: {
            person: true
          }
        },
        mediaItem: true
      }
    });

    const titleCastingDocs = titleCastings.map((tc: any) => ({
      castingId: `${tc.personId}_${tc.mediaId}`,
      personId: tc.actor.person.personId.toString(),
      mediaId: tc.mediaItem.mediaId.toString(),
      actorId: tc.personId.toString(),
      characterName: tc.characterName,
      castOrder: tc.castOrder,
      personName: tc.actor.person.name,
      mediaTitle: tc.mediaItem.originalTitle,
      mediaType: tc.mediaItem.mediaType
    }));

    if (titleCastingDocs.length > 0) {
      await titleCastingRepo.insertMany(titleCastingDocs);
    }
    console.log(`Migrated ${titleCastingDocs.length} title castings`);

    // Migrate Episode Castings as separate documents
    console.log("Migrating episode castings...");
    const episodeCastings = await prisma.episodeCasting.findMany({
      include: {
        actor: {
          include: {
            person: true
          }
        },
        episode: {
          include: {
            season: {
              include: {
                tvShow: {
                  include: {
                    mediaItem: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const episodeCastingDocs = episodeCastings.map((ec: any) => ({
      castingId: `${ec.personId}_${ec.episodeId}`,
      actorId: ec.personId.toString(),
      episodeId: ec.episode.episodeId.toString(),
      characterName: ec.characterName,
      castOrder: ec.castOrder,
      personName: ec.actor.person.name,
      episodeName: ec.episode.name,
      episodeNumber: ec.episode.episodeNumber,
      seasonNumber: ec.episode.season.seasonNumber,
      showTitle: ec.episode.season.tvShow.mediaItem.originalTitle
    }));

    if (episodeCastingDocs.length > 0) {
      await episodeCastingRepo.insertMany(episodeCastingDocs);
    }
    console.log(`Migrated ${episodeCastingDocs.length} episode castings`);

    // Migrate Title Crew Assignments as separate documents
    console.log("Migrating title crew assignments...");
    const titleCrewAssignments = await prisma.titleCrewAssignment.findMany({
      include: {
        crewMember: {
          include: {
            person: true
          }
        },
        mediaItem: true
      }
    });

    const titleCrewAssignmentDocs = titleCrewAssignments.map((tca: any) => ({
      assignmentId: `${tca.personId}_${tca.mediaId}`,
      personId: tca.crewMember.person.personId.toString(),
      mediaId: tca.mediaItem.mediaId.toString(),
      crewMemberId: tca.personId.toString(),
      department: tca.department,
      jobTitle: tca.jobTitle,
      personName: tca.crewMember.person.name,
      mediaTitle: tca.mediaItem.originalTitle,
      mediaType: tca.mediaItem.mediaType
    }));

    if (titleCrewAssignmentDocs.length > 0) {
      await titleCrewAssignmentRepo.insertMany(titleCrewAssignmentDocs);
    }
    console.log(`Migrated ${titleCrewAssignmentDocs.length} title crew assignments`);

    // Migrate Episode Crew Assignments as separate documents
    console.log("Migrating episode crew assignments...");
    const episodeCrewAssignments = await prisma.episodeCrewAssignment.findMany({
      include: {
        crewMember: {
          include: {
            person: true
          }
        },
        episode: {
          include: {
            season: {
              include: {
                tvShow: {
                  include: {
                    mediaItem: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const episodeCrewAssignmentDocs = episodeCrewAssignments.map((eca: any) => ({
      assignmentId: `${eca.personId}_${eca.episodeId}`,
      crewMemberId: eca.personId.toString(),
      episodeId: eca.episode.episodeId.toString(),
      department: eca.department,
      jobTitle: eca.jobTitle,
      personName: eca.crewMember.person.name,
      episodeName: eca.episode.name,
      episodeNumber: eca.episode.episodeNumber,
      seasonNumber: eca.episode.season.seasonNumber,
      showTitle: eca.episode.season.tvShow.mediaItem.originalTitle
    }));

    if (episodeCrewAssignmentDocs.length > 0) {
      await episodeCrewAssignmentRepo.insertMany(episodeCrewAssignmentDocs);
    }
    console.log(`Migrated ${episodeCrewAssignmentDocs.length} episode crew assignments`);

    console.log("MongoDB migration completed successfully!");

  } catch (error) {
    console.error("MongoDB migration error:", error);
    throw error;
  } finally {
    await MongoDataSource.destroy();
  }
};

// Helper function to migrate fully nested MediaItems with all related data
const migrateFullyNestedMediaItems = async (
  prisma: PrismaClient
) => {
  console.log("Connecting to 'collections' database...");
  
  try {
    await CollectionsDataSource.initialize();
    console.log("Connected to 'collections' database!");

    // Get MongoDB native connection to work with any collection name
    const connection = (CollectionsDataSource.driver as any).queryRunner.databaseConnection;
    
    // Clear existing data from custom-named collections
    try {
      await connection.db('collections').collection('movie_simple_example').deleteMany({});
      await connection.db('collections').collection('movie_full_example').deleteMany({});
      await connection.db('collections').collection('tvshow_full_example').deleteMany({});
      await connection.db('collections').collection('actor_full_example').deleteMany({});
    } catch (e) {
      // Collections might not exist yet, that's ok
    }
    console.log("Cleared existing data from 'collections' database");

    console.log("Fetching all media items with full nested data...");

    // Fetch all media items with all related data
  const mediaItems = await prisma.mediaItem.findMany({
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
              episodes: {
                include: {
                  episodeCastings: {
                    include: {
                      actor: {
                        include: {
                          person: true
                        }
                      }
                    }
                  },
                  episodeCrewAssignments: {
                    include: {
                      crewMember: {
                        include: {
                          person: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      mediaGenres: {
        include: {
          genre: true
        }
      },
      mediaCompanies: {
        include: {
          company: true
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
      },
      titleCrewAssignments: {
        include: {
          crewMember: {
            include: {
              person: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${mediaItems.length} media items to migrate`);

  const fullyNestedDocs = mediaItems.map((mediaItem: any) => {
    // Base media item data
    const doc: any = {
      mediaId: mediaItem.mediaId.toString(),
      tmdbId: mediaItem.tmdbId?.toString(),
      mediaType: mediaItem.mediaType,
      originalTitle: mediaItem.originalTitle,
      overview: mediaItem.overview,
      originalLanguage: mediaItem.originalLanguage,
      status: mediaItem.status,
      popularity: parseFloat(mediaItem.popularity),
      voteAverage: parseFloat(mediaItem.voteAverage),
      voteCount: mediaItem.voteCount,
      posterPath: mediaItem.posterPath,
      backdropPath: mediaItem.backdropPath,
      homepageUrl: mediaItem.homepageUrl
    };

    // Add movie-specific data with collection
    if (mediaItem.movie) {
      doc.movie = {
        releaseDate: mediaItem.movie.releaseDate,
        budget: Number(mediaItem.movie.budget),
        revenue: Number(mediaItem.movie.revenue),
        adultFlag: mediaItem.movie.adultFlag,
        runtimeMinutes: mediaItem.movie.runtimeMinutes,
        collectionId: mediaItem.movie.collectionId?.toString(),
        collection: mediaItem.movie.collection ? {
          collectionId: mediaItem.movie.collection.collectionId.toString(),
          tmdbId: mediaItem.movie.collection.tmdbId?.toString(),
          name: mediaItem.movie.collection.name,
          overview: mediaItem.movie.collection.overview,
          posterPath: mediaItem.movie.collection.posterPath,
          backdropPath: mediaItem.movie.collection.backdropPath
        } : null
      };
    }

    // Add TV show-specific data with nested seasons and episodes
    if (mediaItem.tvShow) {
      doc.tvShow = {
        firstAirDate: mediaItem.tvShow.firstAirDate,
        lastAirDate: mediaItem.tvShow.lastAirDate,
        inProduction: mediaItem.tvShow.inProduction,
        numberOfSeasons: mediaItem.tvShow.numberOfSeasons,
        numberOfEpisodes: mediaItem.tvShow.numberOfEpisodes,
        showType: mediaItem.tvShow.showType,
        seasons: mediaItem.tvShow.seasons.map((season: any) => ({
          seasonId: season.seasonId.toString(),
          seasonNumber: season.seasonNumber,
          name: season.name,
          airDate: season.airDate,
          episodeCount: season.episodeCount,
          posterPath: season.posterPath,
          episodes: season.episodes.map((episode: any) => ({
            episodeId: episode.episodeId.toString(),
            episodeNumber: episode.episodeNumber,
            name: episode.name,
            airDate: episode.airDate,
            runtimeMinutes: episode.runtimeMinutes,
            overview: episode.overview,
            stillPath: episode.stillPath,
            cast: episode.episodeCastings.map((casting: any) => ({
              castingId: casting.castingId.toString(),
              personId: casting.actor.person.personId.toString(),
              personName: casting.actor.person.name,
              characterName: casting.characterName,
              castOrder: casting.castOrder,
              gender: casting.actor.person.gender,
              profilePath: casting.actor.person.profilePath,
              biography: casting.actor.person.biography,
              birthDate: casting.actor.person.birthDate,
              deathDate: casting.actor.person.deathDate,
              placeOfBirth: casting.actor.person.placeOfBirth
            })),
            crew: episode.episodeCrewAssignments.map((assignment: any) => ({
              crewAssignmentId: assignment.crewAssignmentId.toString(),
              personId: assignment.crewMember.person.personId.toString(),
              personName: assignment.crewMember.person.name,
              department: assignment.department,
              jobTitle: assignment.jobTitle,
              gender: assignment.crewMember.person.gender,
              profilePath: assignment.crewMember.person.profilePath,
              biography: assignment.crewMember.person.biography,
              birthDate: assignment.crewMember.person.birthDate,
              deathDate: assignment.crewMember.person.deathDate,
              placeOfBirth: assignment.crewMember.person.placeOfBirth
            }))
          }))
        }))
      };
    }

    // Add genres
    doc.genres = mediaItem.mediaGenres.map((mg: any) => ({
      genreId: mg.genre.genreId.toString(),
      name: mg.genre.name
    }));

    // Add companies with roles
    doc.companies = mediaItem.mediaCompanies.map((mc: any) => ({
      companyId: mc.company.companyId.toString(),
      name: mc.company.name,
      role: mc.role,
      originCountry: mc.company.originCountry,
      logoPath: mc.company.logoPath,
      description: mc.company.description
    }));

    // Add title-level cast (for movies and TV shows)
    doc.cast = mediaItem.titleCastings.map((casting: any) => ({
      castingId: casting.castingId.toString(),
      personId: casting.actor.person.personId.toString(),
      personName: casting.actor.person.name,
      characterName: casting.characterName,
      castOrder: casting.castOrder,
      gender: casting.actor.person.gender,
      profilePath: casting.actor.person.profilePath,
      biography: casting.actor.person.biography,
      birthDate: casting.actor.person.birthDate,
      deathDate: casting.actor.person.deathDate,
      placeOfBirth: casting.actor.person.placeOfBirth
    }));

    // Add title-level crew (for movies and TV shows)
    doc.crew = mediaItem.titleCrewAssignments.map((assignment: any) => ({
      crewAssignmentId: assignment.crewAssignmentId.toString(),
      personId: assignment.crewMember.person.personId.toString(),
      personName: assignment.crewMember.person.name,
      department: assignment.department,
      jobTitle: assignment.jobTitle,
      gender: assignment.crewMember.person.gender,
      profilePath: assignment.crewMember.person.profilePath,
      biography: assignment.crewMember.person.biography,
      birthDate: assignment.crewMember.person.birthDate,
      deathDate: assignment.crewMember.person.deathDate,
      placeOfBirth: assignment.crewMember.person.placeOfBirth
    }));

    return doc;
  });

  // Insert into custom-named collections
  const movieFullDocs = fullyNestedDocs.filter((doc: any) => doc.mediaType === 'movie');
  const tvShowFullDocs = fullyNestedDocs.filter((doc: any) => doc.mediaType === 'tv');

  if (fullyNestedDocs.length > 0) {
    await connection.db('collections').collection('movie_simple_example').insertMany(fullyNestedDocs);
    console.log(`✓ Migrated ${fullyNestedDocs.length} fully nested media items to 'movie_simple_example' collection`);
  }

  if (movieFullDocs.length > 0) {
    await connection.db('collections').collection('movie_full_example').insertMany(movieFullDocs);
    console.log(`✓ Migrated ${movieFullDocs.length} fully nested movies to 'movie_full_example' collection`);
  }

  if (tvShowFullDocs.length > 0) {
    await connection.db('collections').collection('tvshow_full_example').insertMany(tvShowFullDocs);
    console.log(`✓ Migrated ${tvShowFullDocs.length} fully nested TV shows to 'tvshow_full_example' collection`);
  }

  // Create Actor full example collection
  console.log("Fetching actors with full nested data...");
  const actors = await prisma.actor.findMany({
    include: {
      person: true,
      titleCastings: {
        include: {
          mediaItem: {
            include: {
              movie: {
                include: {
                  collection: true
                }
              },
              tvShow: true,
              mediaGenres: {
                include: {
                  genre: true
                }
              }
            }
          }
        }
      },
      episodeCastings: {
        include: {
          episode: {
            include: {
              season: {
                include: {
                  tvShow: {
                    include: {
                      mediaItem: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const actorFullDocs = actors.map((actor: any) => ({
    actorId: actor.personId.toString(),
    personId: actor.person.personId.toString(),
    name: actor.person.name,
    gender: actor.person.gender,
    biography: actor.person.biography,
    birthDate: actor.person.birthDate,
    deathDate: actor.person.deathDate,
    placeOfBirth: actor.person.placeOfBirth,
    profilePath: actor.person.profilePath,
    actingDebutYear: actor.actingDebutYear,
    titleRoles: actor.titleCastings.map((tc: any) => ({
      castingId: tc.castingId.toString(),
      mediaId: tc.mediaItem.mediaId.toString(),
      title: tc.mediaItem.originalTitle,
      characterName: tc.characterName,
      castOrder: tc.castOrder,
      mediaType: tc.mediaItem.mediaType,
      overview: tc.mediaItem.overview,
      releaseDate: tc.mediaItem.movie?.releaseDate,
      firstAirDate: tc.mediaItem.tvShow?.firstAirDate,
      posterPath: tc.mediaItem.posterPath,
      voteAverage: parseFloat(tc.mediaItem.voteAverage),
      genres: tc.mediaItem.mediaGenres.map((mg: any) => ({
        genreId: mg.genre.genreId.toString(),
        name: mg.genre.name
      }))
    })),
    episodeRoles: actor.episodeCastings.map((ec: any) => ({
      castingId: ec.castingId.toString(),
      episodeId: ec.episode.episodeId.toString(),
      episodeName: ec.episode.name,
      episodeNumber: ec.episode.episodeNumber,
      seasonNumber: ec.episode.season.seasonNumber,
      characterName: ec.characterName,
      castOrder: ec.castOrder,
      showTitle: ec.episode.season.tvShow.mediaItem.originalTitle,
      showId: ec.episode.season.tvShow.mediaItem.mediaId.toString(),
      airDate: ec.episode.airDate,
      overview: ec.episode.overview
    }))
  }));

  if (actorFullDocs.length > 0) {
    await connection.db('collections').collection('actor_full_example').insertMany(actorFullDocs);
    console.log(`✓ Migrated ${actorFullDocs.length} actors with full nested data to 'actor_full_example' collection`);
  }
  
  } catch (error) {
    console.error("Error migrating to 'collections' database:", error);
    throw error;
  } finally {
    if (CollectionsDataSource.isInitialized) {
      await CollectionsDataSource.destroy();
    }
  }
};

export default MigrateToMongo;