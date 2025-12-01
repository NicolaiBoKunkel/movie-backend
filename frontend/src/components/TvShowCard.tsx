"use client";

import Link from "next/link";
import Image from "next/image";

interface TvShowSummary {
  mediaId: string;
  originalTitle: string;
  voteAverage: number;
  posterPath: string | null;
  overview: string | null;
  firstAirDate: string | null;
  genres: string[];
}

export default function TvShowCard({ show }: { show: TvShowSummary }) {
  const TMDB_BASE = "https://image.tmdb.org/t/p/original";

  // If poster exists in DB, use TMDB full URL, otherwise fallback to placeholder
  const posterSrc = show.posterPath
    ? `${TMDB_BASE}${show.posterPath}`
    : "/placeholder-poster.png";

  return (
    <div className="rounded shadow-lg bg-teal-100 transform transition-transform duration-300 hover:scale-105 hover:shadow-xl px-6 py-4">
      
      {/* Poster */}
      <Link href={`/tvshow/${show.mediaId}`}>
        <div className="relative w-[185px] h-[278px]">
          <Image
            src={posterSrc}
            alt={show.originalTitle}
            fill
            sizes="185px"
            className="object-cover rounded transition-opacity duration-300 hover:opacity-90"
          />
        </div>
      </Link>

      {/* Title */}
      <div className="mt-4">
        <Link href={`/tvshow/${show.mediaId}`}>
          <h5 className="font-bold text-xl mb-2 text-gray-900 drop-shadow-sm">
            {show.originalTitle.substring(0, 200)}
          </h5>
        </Link>

        {/* Rating */}
        <div className="flex items-center mb-2 text-gray-900">
          <svg
            className="w-4 h-4 text-yellow-300 me-1"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 22 20"
          >
            <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
          </svg>
          <span className="ml-1">{show.voteAverage.toFixed(1)}</span>
        </div>

        {/* Overview Preview */}
        <p className="text-gray-800">
          {(show.overview ?? "No overview available")
            .substring(0, 125)
            .concat("...")}
        </p>

        {/* First Air Date */}
        <div className="flex justify-between items-center mt-4">
          <span className="text-gray-800">
            {show.firstAirDate ? show.firstAirDate.substring(0, 10) : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
