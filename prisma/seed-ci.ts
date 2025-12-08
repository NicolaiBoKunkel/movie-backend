import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Running CI seed...");

  // Minimal MediaItems
  await prisma.mediaItem.createMany({
    data: [
      {
        mediaId: 1,
        tmdbId: 1,
        mediaType: "movie",
        originalTitle: "Test Movie 1",
        originalLanguage: "en",
        status: "Released",
        popularity: 1,
        voteAverage: 5,
        voteCount: 1
      },
      {
        mediaId: 2,
        tmdbId: 2,
        mediaType: "movie",
        originalTitle: "Test Movie 2",
        originalLanguage: "en",
        status: "Released",
        popularity: 1,
        voteAverage: 5,
        voteCount: 1
      },
      {
        mediaId: 3,
        tmdbId: 3,
        mediaType: "movie",
        originalTitle: "Test Movie 3",
        originalLanguage: "en",
        status: "Released",
        popularity: 1,
        voteAverage: 5,
        voteCount: 1
      }
    ],
    skipDuplicates: true,
  });

  // Minimal Movies
  await prisma.movie.createMany({
    data: [
      { mediaId: 1, releaseDate: new Date("2020-01-01") },
      { mediaId: 2, releaseDate: new Date("2020-01-02") },
      { mediaId: 3, releaseDate: new Date("2020-01-03") }
    ],
    skipDuplicates: true,
  });

  console.log(" CI seed completed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
