import { PrismaClient } from "@prisma/client";

export const migrateActorFullCollection = async (prisma: PrismaClient, connection: any) => {
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
};
