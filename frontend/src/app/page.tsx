"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-teal-50 px-6">
      <h1 className="text-4xl font-bold text-teal-700 mb-10 text-center">
        Welcome to the Movie & TV Show Explorer
      </h1>

      <div className="flex flex-col sm:flex-row gap-6">

        {/* Movies Button */}
        <Link
          href="/highestRatedMovies"
          className="bg-teal-600 text-white px-8 py-4 rounded-lg text-xl font-semibold shadow-md hover:bg-teal-700 transition"
        >
          Highest Rated Movies with TMDB API
        </Link>

        {/* TV Shows Button */}
        <Link
          href="/tvshows"
          className="bg-teal-600 text-white px-8 py-4 rounded-lg text-xl font-semibold shadow-md hover:bg-teal-700 transition"
        >
          TV Shows with SQL Database
        </Link>

      </div>
    </div>
  );
}
