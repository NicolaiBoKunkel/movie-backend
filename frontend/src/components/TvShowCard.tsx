"use client";

import Link from "next/link";

interface TvShowSummary {
  mediaId: string;
  originalTitle: string;
  voteAverage: number;
  genres: string[];
}

export default function TvShowCard({
  show,
}: {
  show: TvShowSummary;
}) {
  return (
    <div className="rounded shadow-lg bg-teal-100 p-4">
      <Link href={`/tvshow/${show.mediaId}`}>
        <h3 className="text-xl font-bold text-gray-900 hover:underline">
          {show.originalTitle}
        </h3>
      </Link>

      <p className="text-gray-700 mt-2">
        ⭐ {show.voteAverage.toFixed(1)}
      </p>

      <p className="text-gray-700 text-sm mt-2">
        {show.genres.join(", ")}
      </p>
    </div>
  );
}
