'use client';

import { useEffect, useRef, useState } from "react";
import Link from 'next/link'; 
import Image from 'next/image';
import NavLink from "./nav-link";
//import SearchBar from "./SearchBar";
import logoImg from '/public/movie_black2.jpg';
//import { getCurrentUser } from "@/lib/apis/authApi";
import styles from './nav-link.module.css';

/**
* Header component for the application.
* Displays the logo, navigation links, search bar, and user authentication controls.
*/

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [isMoviesOpen, setIsMoviesOpen] = useState(false);
  const [isTvOpen, setIsTvOpen] = useState(false);

  const moviesRef = useRef<HTMLDivElement>(null);
  const tvRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moviesRef.current &&
        !moviesRef.current.contains(event.target as Node)
      ) {
        setIsMoviesOpen(false);
      }

      if (
        tvRef.current &&
        !tvRef.current.contains(event.target as Node)
      ) {
        setIsTvOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <nav className="bg-teal-500 p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-6 flex-wrap">
        <Link href="/">
          <div className="rounded-full overflow-hidden">
          </div>
        </Link>
        <div className="flex gap-4 text-lg font-semibold relative">

          <NavLink href="/">Home</NavLink>


          {/* Movies Dropdown */}
          <div ref={moviesRef} className="relative">
            <button
              onClick={() => setIsMoviesOpen((prev) => !prev)}
              className={styles.link}
            >
              Movies
            </button>
            {isMoviesOpen && (
              <div className="absolute mt-2 bg-white rounded-md shadow-lg z-50 min-w-[180px] overflow-hidden border border-gray-200">
                {/*<Link
                  href="/popularMovies"
                  className="block px-4 py-2 text-teal-800 hover:bg-gray-100 hover:text-teal-900 transition"
                >
                  Popular
                </Link>*/}
                <Link
                  href="/highestRatedMovies"
                  className="block px-4 py-2 text-teal-800 hover:bg-gray-100 hover:text-teal-900 transition"
                >
                  Highest Rated
                </Link>
              </div>
            )}
          </div>

          {/* TV Shows Dropdown */}
          <div ref={tvRef} className="relative">
            <button
              onClick={() => setIsTvOpen((prev) => !prev)}
              className={styles.link}
            >
              TV Shows
            </button>
            {isTvOpen && (
              <div className="absolute mt-2 bg-white rounded-md shadow-lg z-50 min-w-[180px] overflow-hidden border border-gray-200">
                {/*<Link
                  href="/popularTv"
                  className="block px-4 py-2 text-teal-800 hover:bg-gray-100 hover:text-teal-900 transition"
                >
                  Popular
                </Link>*/}
                <Link
                  href="/tvshows"
                  className="block px-4 py-2 text-teal-800 hover:bg-gray-100 hover:text-teal-900 transition"
                >
                  Top Rated
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
