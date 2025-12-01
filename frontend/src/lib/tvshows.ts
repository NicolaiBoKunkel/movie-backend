const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

/**
 * Fetch all TV shows (summary list)
 */
export async function fetchTvShows(page: number = 1, limit: number = 12) {
  const offset = (page - 1) * limit;

  const res = await fetch(
    `${BACKEND_URL}/tv?limit=${limit}&offset=${offset}`,
    { cache: "no-store" }
  );

  if (!res.ok) throw new Error("Failed to fetch TV shows");

  return res.json();
}


/**
 * Fetch one TV show by ID
 */
export async function fetchTvShowById(id: string | number) {
  const res = await fetch(`${BACKEND_URL}/tv/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch TV show");
  }

  return res.json();
}
