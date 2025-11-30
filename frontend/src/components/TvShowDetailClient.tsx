"use client";

import Image from "next/image";

interface Season {
  seasonNumber: number;
  name: string | null;
  airDate: string | null;
  episodeCount: number;
  posterPath: string | null;
}

interface CastMember {
  personId: string;
  name: string;
  characterName: string | null;
  castOrder: number | null;
}

interface CrewMember {
  personId: string;
  name: string;
  department: string | null;
  jobTitle: string | null;
}

interface Company {
  companyId: string;
  name: string;
  role: string | null;
}

interface TvShowDetails {
  mediaId: string;
  originalTitle: string;
  overview: string | null;
  originalLanguage: string;
  status: string | null;

  popularity: number | null;
  voteAverage: number;
  voteCount: number | null;

  firstAirDate: string | null;
  lastAirDate: string | null;

  posterPath: string | null;
  backdropPath: string | null;

  genres: string[];

  seasons: Season[];
  cast: CastMember[];
  crew: CrewMember[];
  companies: Company[];
}

export default function TvShowDetailClient({ show }: { show: TvShowDetails }) {
  const backdropUrl = show.backdropPath
    ? `https://image.tmdb.org/t/p/original${show.backdropPath}`
    : undefined;

  return (
    <div
      className="relative w-full min-h-screen bg-cover bg-top bg-fixed"
      style={{
        backgroundImage: backdropUrl ? `url(${backdropUrl})` : undefined,
        backgroundColor: "#f3f4f6",
      }}
    >
      <div
        className={`max-w-5xl mx-auto px-4 ${
          backdropUrl ? "pt-52" : "pt-10"
        } relative z-10`}
      >
        <div className="flex flex-col md:flex-row backdrop-blur-sm bg-white/80 shadow-xl rounded-lg overflow-hidden">
          <div className="relative w-full md:w-1/3 h-[450px] bg-gray-200">
            {show.posterPath && (
              <Image
                src={`https://image.tmdb.org/t/p/w500${show.posterPath}`}
                alt={show.originalTitle}
                fill
                className="object-cover"
              />
            )}
          </div>

          <div className="p-6 space-y-3 flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {show.originalTitle}
            </h1>

            {show.overview && (
              <p className="text-gray-700">{show.overview}</p>
            )}

            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>First Air Date:</strong>{" "}
                {show.firstAirDate || "N/A"}
              </p>
              <p>
                <strong>Rating:</strong> ⭐ {show.voteAverage}
              </p>
              <p>
                <strong>Genres:</strong> {show.genres.join(", ")}
              </p>
              <p>
                <strong>Status:</strong> {show.status || "N/A"}
              </p>
              <p>
                <strong>Language:</strong>{" "}
                {show.originalLanguage.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* SEASONS */}
        {show.seasons.length > 0 && (
          <div className="backdrop-blur-sm bg-white/80 mt-6 p-6 rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4">📺 Seasons</h2>
            <ul className="space-y-2">
              {show.seasons.map((season) => (
                <li key={season.seasonNumber}>
                  <strong>Season {season.seasonNumber}</strong> —{" "}
                  {season.episodeCount} episodes (
                  {season.airDate || "Unknown"})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CAST */}
        {show.cast.length > 0 && (
          <div className="backdrop-blur-sm bg-white/80 mt-6 p-6 rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4">🎭 Cast</h2>
            <ul className="space-y-2">
              {show.cast.slice(0, 10).map((member) => (
                <li key={member.personId}>
                  {member.name} — {member.characterName || "Unknown"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
