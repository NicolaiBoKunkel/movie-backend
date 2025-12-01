"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
  release_date: string;
}

const MovieCard = ({
  movie,
  compact = false,
}: {
  movie: Movie;
  compact?: boolean;
}) => {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

  const posterBasePath = "https://image.tmdb.org/t/p/original/";
  const trailerBaseUrl = "https://www.youtube.com/watch?v=";

  useEffect(() => {
    const loadTrailer = async () => {
      try {
        const res = await fetch(`/api/movies/${movie.id}/trailer`);
        if (!res.ok) return;

        const data = await res.json();
        setTrailerKey(data.trailerKey || null);
      } catch (err) {
        console.log("Error fetching trailer:", err);
      }
    };

    loadTrailer();
  }, [movie.id]);

  const handlePlayTrailer = () => {
    if (trailerKey) {
      window.open(trailerBaseUrl + trailerKey, "_blank");
    }
  };

  return (
    <div
      className={`rounded shadow-lg ${
        compact ? "" : "bg-teal-100"
      } transform transition-transform duration-300 hover:scale-105 hover:shadow-xl`}
      data-cy="movie-card"
      data-movie-id={movie.id}
    >
      <div className={`${compact ? "" : "px-6 py-4"}`}>

        <Link
          href={`/movie/${movie.id}`}
          data-cy="movie-card-link"
          data-movie-id={movie.id}
        >
          <div
            className={`relative ${
              compact ? "w-[120px] h-[180px]" : "w-[185px] h-[278px]"
            }`}
            data-cy="movie-poster"
          >
            <Image
              src={posterBasePath + movie.poster_path}
              alt={movie.title}
              fill
              className="object-cover rounded transition-opacity duration-300 hover:opacity-90"
              sizes="(max-width: 640px) 100vw, 185px"
            />
          </div>
        </Link>

        {!compact && (
          <div className="mt-4">

            <Link
              href={`/movie/${movie.id}`}
              data-cy="movie-title-link"
            >
              <h5
                className="font-bold text-xl mb-2 text-gray-900 drop-shadow-sm"
                data-cy="movie-title"
              >
                {movie.title.substring(0, 200)}
              </h5>
            </Link>

            <div
              className="flex items-center mb-2 text-gray-900"
              data-cy="movie-rating"
            >
              ⭐ <span className="ml-1">{movie.vote_average}</span>
            </div>

            <p className="text-gray-800" data-cy="movie-overview">
              {movie.overview.substring(0, 125).concat("....")}
            </p>

            <div className="flex justify-between items-center mt-4">

              <span
                className="text-gray-800"
                data-cy="movie-release-date"
              >
                {movie.release_date}
              </span>

              {trailerKey && (
                <button
                  className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded"
                  onClick={handlePlayTrailer}
                  data-cy="movie-trailer-btn"
                >
                  Trailer
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
