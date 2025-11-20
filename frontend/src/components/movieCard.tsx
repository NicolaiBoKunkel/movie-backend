'use client';

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
    } else {
      console.log("No trailer found");
    }
  };

  return (
    <div
      className={`rounded shadow-lg ${
        compact ? "" : "bg-teal-100"
      } transform transition-transform duration-300 hover:scale-105 hover:shadow-xl`}
    >
      <div className={`${compact ? "" : "px-6 py-4"}`}>
        <Link href={`/movie/${movie.id}`}>
          <div
            className={`relative ${
              compact ? "w-[120px] h-[180px]" : "w-[185px] h-[278px]"
            }`}
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
            <Link href={`/movie/${movie.id}`}>
              <h5 className="font-bold text-xl mb-2 text-gray-900 drop-shadow-sm">
                {movie.title.substring(0, 200)}
              </h5>
            </Link>

            <div className="flex items-center mb-2 text-gray-900">
              <svg
                className="w-4 h-4 text-yellow-300 me-1"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 22 20"
              >
                <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
              </svg>
              <span className="ml-1 text-gray-900">{movie.vote_average}</span>
            </div>

            <p className="text-gray-800">
              {movie.overview.substring(0, 125).concat("....")}
            </p>

            <div className="flex justify-between items-center mt-4">
              <span className="text-gray-800">{movie.release_date}</span>

              {trailerKey && (
                <button
                  className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded"
                  onClick={handlePlayTrailer}
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
