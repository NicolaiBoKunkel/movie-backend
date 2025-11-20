'use client';

import Image from "next/image";
import Link from "next/link";

interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  release_date: string;
  original_language: string;
  genres: { id: number; name: string }[];
  runtime: number;
  tagline: string;
  production_companies: { name: string; logo_path: string | null }[];
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface Props {
  movie: Movie;
  trailerKey: string | null;
  cast: CastMember[];
}

/**
 * MovieDetailClient — Clean TMDB-only version.
 * Displays movie poster, details, cast, and trailer button.
 */
export default function MovieDetailClient({
  movie,
  trailerKey,
  cast,
}: Props) {
  if (!movie) {
    return (
      <div className="text-center py-10 text-gray-500">
        Loading...
      </div>
    );
  }

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : undefined;

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
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
            {posterUrl && (
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                className="object-cover"
              />
            )}
          </div>

          <div className="p-6 space-y-3 flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{movie.title}</h1>

            {movie.tagline && (
              <p className="italic text-teal-600">
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {movie.overview && (
              <p className="text-gray-700">{movie.overview}</p>
            )}

            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Release Date:</strong> {movie.release_date || "N/A"}
              </p>
              <p>
                <strong>TMDB Rating:</strong> ⭐ {movie.vote_average}
              </p>
              <p>
                <strong>Runtime:</strong>{" "}
                {movie.runtime
                  ? `⏱️ ${movie.runtime} minutes`
                  : "⏱️ N/A"}
              </p>
              <p>
                <strong>Language:</strong>{" "}
                {movie.original_language
                  ? movie.original_language.toUpperCase()
                  : "N/A"}
              </p>
              <p>
                <strong>Genres:</strong>{" "}
                {movie.genres && movie.genres.length > 0
                  ? movie.genres.map((g) => g.name).join(", ")
                  : "N/A"}
              </p>
            </div>

            <div className="flex gap-4 flex-wrap mt-4">
              {trailerKey && (
                <button
                  onClick={() =>
                    window.open(
                      `https://www.youtube.com/watch?v=${trailerKey}`,
                      "_blank"
                    )
                  }
                  className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 transition"
                >
                  ▶️ Watch Trailer
                </button>
              )}
            </div>
          </div>
        </div>

        {cast.length > 0 && (
          <div className="backdrop-blur-sm bg-white/80 mt-6 p-6 rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4">🎭 Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {cast.slice(0, 12).map((member) => (
                <div
                  key={member.id}
                  className="text-center bg-gray-50 p-2 rounded shadow hover:shadow-md transition"
                >
                  {member.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/original${member.profile_path}`}
                      alt={member.name}
                      width={120}
                      height={160}
                      className="rounded mx-auto"
                    />
                  ) : (
                    <div className="w-[120px] h-[160px] bg-gray-300 rounded mx-auto" />
                  )}

                  <p className="font-semibold mt-2 text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
