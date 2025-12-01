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

  inProduction: boolean;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  showType: string | null;

  posterPath: string | null;
  backdropPath: string | null;
  homepageUrl: string | null;

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
      data-cy="tv-detail-page"
    >
      <div
        className={`max-w-5xl mx-auto px-4 ${
          backdropUrl ? "pt-52" : "pt-10"
        } relative z-10`}
      >
        {/* MAIN CARD */}
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

          {/* TEXT PANEL */}
          <div className="p-6 space-y-3 flex-1">

            <h1
              className="text-3xl font-bold text-gray-900"
              data-cy="tv-detail-title"
            >
              {show.originalTitle}
            </h1>

            {show.overview && (
              <p className="text-gray-700" data-cy="tv-detail-overview">
                {show.overview}
              </p>
            )}

            {/* QUICK FACTS */}
            <div className="text-sm text-gray-600 space-y-1">

              <p data-cy="tv-detail-showtype">
                <strong>Show Type:</strong> {show.showType || "N/A"}
              </p>

              <p data-cy="tv-detail-status">
                <strong>Status:</strong> {show.status || "N/A"}
              </p>

              <p data-cy="tv-detail-inproduction">
                <strong>In Production:</strong>{" "}
                {show.inProduction ? "Yes" : "No"}
              </p>

              <p data-cy="tv-detail-first-air">
                <strong>First Air Date:</strong> {show.firstAirDate || "N/A"}
              </p>

              <p data-cy="tv-detail-last-air">
                <strong>Last Air Date:</strong> {show.lastAirDate || "N/A"}
              </p>

              <p data-cy="tv-detail-seasons">
                <strong>Seasons:</strong> {show.numberOfSeasons ?? "?"}
              </p>

              <p data-cy="tv-detail-episodes">
                <strong>Episodes:</strong> {show.numberOfEpisodes ?? "?"}
              </p>

              <p data-cy="tv-detail-genres">
                <strong>Genres:</strong>{" "}
                {show.genres.length ? show.genres.join(", ") : "N/A"}
              </p>

              <p data-cy="tv-detail-rating">
                <strong>Rating:</strong> ⭐ {show.voteAverage} (
                {show.voteCount ?? 0} votes)
              </p>

              <p data-cy="tv-detail-language">
                <strong>Language:</strong>{" "}
                {show.originalLanguage.toUpperCase()}
              </p>

            </div>
          </div>
        </div>

        {/* Seasons */}
        {show.seasons.length > 0 && (
          <div
            className="backdrop-blur-sm bg-white/80 mt-6 p-6 rounded shadow-md"
            data-cy="tvshow-detail-seasons-section"
          >
            <h2 className="text-2xl font-bold mb-4">📺 Seasons</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {show.seasons.map((s) => (
                <div key={s.seasonNumber} className="rounded shadow bg-white p-3">
                  <h3 className="font-semibold mt-2">
                    Season {s.seasonNumber} — {s.episodeCount} episodes
                  </h3>
                  <p className="text-sm text-gray-600">
                    {s.airDate || "Unknown air date"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CAST */}
        <div
          className="backdrop-blur-sm bg-white/80 mt-6 p-6 rounded shadow-md"
          data-cy="tvshow-detail-cast-section"
        >
          <h2 className="text-2xl font-bold mb-4">🎭 Cast</h2>

          {show.cast.length > 0 ? (
            <ul className="space-y-2">
              {show.cast.slice(0, 15).map((m) => (
                <li key={m.personId}>
                  {m.name} — {m.characterName || "Unknown"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No cast data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
