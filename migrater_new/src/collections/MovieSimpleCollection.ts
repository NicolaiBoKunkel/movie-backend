import { PrismaClient } from "@prisma/client";

export const migrateMovieSimpleCollection = async (prisma: PrismaClient, connection: any) => {
  console.log("Fetching all media items with full nested data...");

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

    doc.genres = mediaItem.mediaGenres.map((mg: any) => ({
      genreId: mg.genre.genreId.toString(),
      name: mg.genre.name
    }));

    doc.companies = mediaItem.mediaCompanies.map((mc: any) => ({
      companyId: mc.company.companyId.toString(),
      name: mc.company.name,
      role: mc.role,
      originCountry: mc.company.originCountry,
      logoPath: mc.company.logoPath,
      description: mc.company.description
    }));

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

  if (fullyNestedDocs.length > 0) {
    await connection.db('collections').collection('movie_simple_example').insertMany(fullyNestedDocs);
    console.log(`✓ Migrated ${fullyNestedDocs.length} fully nested media items to 'movie_simple_example' collection`);
  }

  return fullyNestedDocs;
};
