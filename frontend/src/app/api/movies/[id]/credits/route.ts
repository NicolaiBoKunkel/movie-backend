import { NextResponse } from "next/server";
import { fetchMovieCredits } from "@/lib/tmdb";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const data = await fetchMovieCredits(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Credits error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
