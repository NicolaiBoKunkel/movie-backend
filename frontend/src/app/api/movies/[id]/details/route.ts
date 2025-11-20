import { NextResponse } from "next/server";
import { fetchMovieDetails } from "@/lib/tmdb";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const data = await fetchMovieDetails(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Details error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
