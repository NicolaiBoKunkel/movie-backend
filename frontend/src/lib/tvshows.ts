// Use BACKEND_URL for server-side requests (inside Docker)
// Use NEXT_PUBLIC_BACKEND_URL for client-side requests (browser)
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

/**
 * Fetch all TV shows (summary list)
 */
export async function fetchTvShows(
  page: number = 1,
  limit: number = 12,
  search: string = ""
) {
  const offset = (page - 1) * limit;

  const params = new URLSearchParams();
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());

  // Optional search query
  if (search && search.trim().length > 0) {
    params.set("search", search.trim());
  }

  const res = await fetch(`${BACKEND_URL}/tv?${params.toString()}`, {
    cache: "no-store",
  });

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
