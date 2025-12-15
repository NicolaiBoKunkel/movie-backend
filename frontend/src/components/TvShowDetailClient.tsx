"use client";

import Image from "next/image";

interface Genre {
  genreId: string;
  name: string;
}

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

  genres: Genre[];

  seasons: Season[];
  cast: CastMember[];
  crew: CrewMember[];
  companies: Company[];
}

type Props = {
  show: TvShowDetails;
};

function normalizeDate(d: string | null): string {
  if (!d) return "N/A";
  const idx = d.indexOf("T");
  return idx > 0 ? d.slice(0, idx) : d;
}

export default function TvShowDetailClient({ show }: Props) {
  const backdropUrl = show.backdropPath
    ? `https://image.tmdb.org/t/p/original${show.backdropPath}`
    : undefined;

  return (
    <div
      className="relative w-full min-h-screen bg-cover bg-top bg-fixed"
      style={{
        backgroundImage: backdropUrl ? `url(${backdropUrl})` : undefined,
        backgroundColor: "#111827",
      }}
      data-cy="tv-detail-page"
    >
      {backdropUrl && (
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      )}

      <div
        className={`max-w-6xl mx-auto px-4 ${
          backdropUrl ? "pt-32 pb-16" : "py-10"
        } relative z-10`}
      >
        {/* MAIN CARD */}
        <div className="flex flex-col md:flex-row bg-white/95 shadow-2xl rounded-xl overflow-hidden border border-gray-200">
          {/* Poster */}
          <div className="relative w-full md:w-1/3 bg-gray-200 flex items-center justify-center p-4">
            {show.posterPath && (
              <Image
                src={`https://image.tmdb.org/t/p/w500${show.posterPath}`}
                alt={show.originalTitle}
                width={500}
                height={750}
                className="object-contain rounded-lg shadow-md"
              />
            )}
          </div>

          {/* TEXT PANEL */}
          <div className="p-6 md:p-8 space-y-4 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h1
                className="text-3xl md:text-4xl font-bold text-gray-900"
                data-cy="tv-detail-title"
              >
                {show.originalTitle}
              </h1>

              {show.homepageUrl && (
                <a
                  href={show.homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-cy="tv-detail-homepage"
                  className="
                    hidden sm:inline-flex
                    items-center justify-center
                    px-2 py-2
                    text-sm font-medium
                    text-indigo-600
                    border border-indigo-500
                    rounded-lg
                    hover:bg-indigo-50
                    transition
                    leading-none
                  "
                >
                  Official Site
                </a>
              )}
            </div>

            {show.overview && (
              <p
                className="text-sm md:text-base text-gray-900 leading-relaxed"
                data-cy="tv-detail-overview"
              >
                {show.overview}
              </p>
            )}

            {/* QUICK FACTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-900">
              <p data-cy="tv-detail-showtype">
                <span className="font-semibold">Show Type:</span>{" "}
                {show.showType || "N/A"}
              </p>

              <p data-cy="tv-detail-status">
                <span className="font-semibold">Status:</span>{" "}
                {show.status || "N/A"}
              </p>

              <p data-cy="tv-detail-inproduction">
                <span className="font-semibold">In Production:</span>{" "}
                {show.inProduction ? "Yes" : "No"}
              </p>

              <p data-cy="tv-detail-first-air">
                <span className="font-semibold">First Air Date:</span>{" "}
                {normalizeDate(show.firstAirDate)}
              </p>

              <p data-cy="tv-detail-last-air">
                <span className="font-semibold">Last Air Date:</span>{" "}
                {normalizeDate(show.lastAirDate)}
              </p>

              <p data-cy="tv-detail-seasons">
                <span className="font-semibold">Seasons:</span>{" "}
                {show.numberOfSeasons ?? "?"}
              </p>

              <p data-cy="tv-detail-episodes">
                <span className="font-semibold">Episodes:</span>{" "}
                {show.numberOfEpisodes ?? "?"}
              </p>

              <p data-cy="tv-detail-rating">
                <span className="font-semibold">Rating:</span> ⭐{" "}
                {show.voteAverage} ({show.voteCount ?? 0} votes)
              </p>

              <p data-cy="tv-detail-language">
                <span className="font-semibold">Language:</span>{" "}
                {show.originalLanguage.toUpperCase()}
              </p>

              <p data-cy="tv-detail-genres" className="sm:col-span-2">
                <span className="font-semibold">Genres:</span>{" "}
                {show.genres.length
                  ? show.genres.map((g) => g.name).join(", ")
                  : "N/A"}
              </p>
            </div>

            {/* Companies */}
            {show.companies.length > 0 && (
              <div
                className="pt-2 border-t border-gray-200 mt-2"
                data-cy="tv-detail-companies-section"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Companies
                </h3>
                <ul className="text-sm text-gray-900 flex flex-wrap gap-2">
                  {show.companies.map((c) => (
                    <li
                      key={c.companyId}
                      className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200"
                    >
                      {c.name}
                      {c.role && (
                        <span className="text-xs text-gray-600">
                          {" "}
                          ({c.role})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Seasons */}
        {show.seasons.length > 0 && (
          <section
            className="bg-white/95 mt-8 p-6 md:p-7 rounded-xl shadow-xl border border-gray-200"
            data-cy="tv-detail-seasons-section"
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              📺 Seasons
            </h2>

            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {show.seasons.map((s) => (
                <div
                  key={s.seasonNumber}
                  className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden"
                >
                  {s.posterPath && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w300${s.posterPath}`}
                      alt={s.name ?? `Season ${s.seasonNumber}`}
                      width={300}
                      height={450}
                      className="w-full object-cover"
                    />
                  )}
                  <div className="p-3 space-y-1">
                    <h3 className="font-semibold text-gray-900">
                      Season {s.seasonNumber} — {s.episodeCount} episodes
                    </h3>
                    <p className="text-sm text-gray-800">
                      {s.name || "No title"}
                    </p>
                    <p className="text-xs text-gray-700">
                      {s.airDate
                        ? normalizeDate(s.airDate)
                        : "Unknown air date"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cast & Crew - two columns on large screens */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CAST */}
          <section
            className="bg-white/95 p-6 rounded-xl shadow-xl border border-gray-200"
            data-cy="tv-detail-cast-section"
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-900">🎭 Cast</h2>

            {show.cast.length > 0 ? (
              <ul className="space-y-2 text-sm text-gray-900">
                {show.cast.slice(0, 20).map((m) => (
                  <li key={m.personId} className="flex justify-between gap-3">
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-gray-800">
                      as {m.characterName || "Unknown"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-800">
                No cast data available for this show.
              </p>
            )}
          </section>

          {/* CREW */}
          <section
            className="bg-white/95 p-6 rounded-xl shadow-xl border border-gray-200"
            data-cy="tv-detail-crew-section"
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-900">🎬 Crew</h2>

            {show.crew.length > 0 ? (
              <ul className="space-y-2 text-sm text-gray-900">
                {show.crew.slice(0, 20).map((c, index) => (
                  <li
                    key={`${c.personId}-${index}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-gray-800">
                      {c.department && `${c.department} · `}{" "}
                      {c.jobTitle || "Crew"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-800">
                No crew data available for this show.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
