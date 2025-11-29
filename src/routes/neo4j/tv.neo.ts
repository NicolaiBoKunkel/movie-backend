import { Router } from "express";
import { getSession } from "../../db/neo4j";
import neo4j, { Node, Record as NeoRecord } from "neo4j-driver";

const router = Router();

// Helpers
function toJs(value: any) {
  if (neo4j.isInt(value)) return value.toNumber();
  return value ?? null;
}

// Summary Mapper (GET /neo/tv)
function mapNeoTvSummary(props: any) {
  return {
    mediaId: String(props.mediaId),
    originalTitle: props.originalTitle ?? "",
    voteAverage: Number(props.voteAverage ?? 0),
    genres: props.genres ?? [],
  };
}

// GET /neo/tv (List/Search)
router.get("/", async (req, res) => {
  const session = getSession();
  const search = (req.query.search as string)?.trim() ?? "";
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  try {
    let cypher = "";
    const params: any = { limit: neo4j.int(limit) };

    if (search.length > 0) {
      cypher = `
        MATCH (mi:MediaItem {mediaType: "tv"})
        -[:IS_TV_SHOW]->(t:TVShow)
        WHERE toLower(mi.originalTitle) CONTAINS toLower($search)
           OR toLower(mi.overview)      CONTAINS toLower($search)
        OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
        WITH mi, collect(g.name) AS genres
        RETURN mi {.*, genres: genres} AS show
        LIMIT $limit
      `;
      params.search = search;
    } else {
      cypher = `
        MATCH (mi:MediaItem {mediaType: "tv"})
        -[:IS_TV_SHOW]->(t:TVShow)
        OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
        WITH mi, collect(g.name) AS genres
        RETURN mi {.*, genres: genres} AS show
        LIMIT $limit
      `;
    }

    const result = await session.run(cypher, params);

    const shows = result.records.map((r: NeoRecord) => {
      const show = r.get("show");
      return mapNeoTvSummary(show);
    });

    res.json(shows);
  } catch (err) {
    console.error("Neo4j GET /tv error:", err);
    res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});

// GET /neo/tv/:id (Full Details)
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (mi:MediaItem {mediaId: $id, mediaType: "tv"})
      MATCH (mi)-[:IS_TV_SHOW]->(t:TVShow)

      /* Genres from MediaItem */
      OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
      WITH mi, t, collect(g.name) AS genres

      /* Companies */
      OPTIONAL MATCH (mi)-[prod:PRODUCED_BY]->(c:Company)
      WITH mi, t, genres,
           collect(
             CASE WHEN c IS NULL THEN null ELSE {
               companyId: c.companyId,
               name:     c.name,
               role:     prod.role
             } END
           ) AS companiesRaw

      /* Cast: Actor -> MediaItem, with optional Person for name */
      OPTIONAL MATCH (a:Actor)-[aRel:ACTED_IN]->(mi)
      OPTIONAL MATCH (a)-[:IS_ACTOR]->(p:Person)
      WITH mi, t, genres, companiesRaw,
           collect(
             CASE WHEN aRel IS NULL THEN null ELSE {
               personId: coalesce(p.personId, a.personId),
               name:     coalesce(p.name, ""),
               characterName: aRel.characterName,
               castOrder:     aRel.castOrder
             } END
           ) AS castRaw

      /* Crew: CrewMember -> MediaItem, with optional Person for name */
      OPTIONAL MATCH (cm:CrewMember)-[w:WORKED_ON]->(mi)
      OPTIONAL MATCH (cm)-[:IS_CREW_MEMBER]->(p2:Person)
      WITH mi, t, genres, companiesRaw, castRaw,
           collect(
             CASE WHEN w IS NULL THEN null ELSE {
               personId: coalesce(p2.personId, cm.personId),
               name:     coalesce(p2.name, ""),
               department: w.department,
               jobTitle:   w.jobTitle
             } END
           ) AS crewRaw

      /* Seasons (TVShow -> Season) */
      OPTIONAL MATCH (t)-[:HAS_SEASON]->(s:Season)
      WITH mi, t, genres, companiesRaw, castRaw, crewRaw,
           collect(s) AS seasons

      RETURN mi, t, genres,
             [c IN companiesRaw WHERE c IS NOT NULL] AS companies,
             [c IN castRaw      WHERE c IS NOT NULL] AS cast,
             [c IN crewRaw      WHERE c IS NOT NULL] AS crew,
             seasons
      LIMIT 1
      `,
      { id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "TV show not found" });
    }

    const record = result.records[0] as NeoRecord;

    const miNode = record.get("mi") as Node | null;
    const tNode = record.get("t") as Node | null;
    const mi = miNode ? miNode.properties : {};
    const t = tNode ? tNode.properties : {};

    const genres = (record.get("genres") ?? []) as string[];
    const companies = ((record.get("companies") ?? []) as any[]).filter(
      (x) => x
    );
    const cast = ((record.get("cast") ?? []) as any[]).filter((x) => x);
    const crew = ((record.get("crew") ?? []) as any[]).filter((x) => x);
    const seasonsRaw = (record.get("seasons") ?? []) as Node[];

    const seasons: any[] = [];

    for (const sNode of seasonsRaw) {
      if (!sNode) continue;
      const sProps = sNode.properties;

      const seasonId = String(sProps.seasonId);

      // Fetch episodes for this season
      const epResult = await session.run(
        `
        MATCH (s:Season {seasonId: $sid})
        OPTIONAL MATCH (s)-[:HAS_EPISODE]->(e:Episode)
        RETURN collect(e) AS eps
        `,
        { sid: seasonId }
      );

      const epRecord = epResult.records[0] as NeoRecord | undefined;
      const episodesRaw = epRecord
        ? ((epRecord.get("eps") ?? []) as Node[])
        : [];

      const episodes = episodesRaw.map((e: Node) => {
        const p = e.properties;
        return {
          episodeId: String(p.episodeId),
          episodeNumber: Number(toJs(p.episodeNumber) ?? 0),
          name: p.name ?? null,
          airDate: p.airDate ?? null,
          runtimeMinutes: toJs(p.runtimeMinutes),
          overview: p.overview ?? null,
          stillPath: p.stillPath ?? null,
        };
      });

      seasons.push({
        seasonNumber: Number(toJs(sProps.seasonNumber)),
        name: sProps.name ?? null,
        airDate: sProps.airDate ?? null,
        episodeCount: Number(
          toJs(sProps.episodeCount) ?? episodes.length
        ),
        posterPath: sProps.posterPath ?? null,
        episodes,
      });
    }

    const dto = {
      mediaId: String(mi.mediaId),
      tmdbId: String(mi.tmdbId),
      mediaType: "tv" as const,

      originalTitle: mi.originalTitle ?? "",
      overview: mi.overview ?? null,
      originalLanguage: mi.originalLanguage ?? "",
      status: mi.status ?? null,

      popularity: mi.popularity != null ? Number(toJs(mi.popularity)) : null,
      voteAverage: Number(mi.voteAverage ?? 0),
      voteCount: mi.voteCount ?? null,

      firstAirDate: t.firstAirDate ?? null,
      lastAirDate: t.lastAirDate ?? null,

      inProduction: Boolean(t.inProduction),
      numberOfSeasons:
        t.numberOfSeasons != null
          ? Number(toJs(t.numberOfSeasons))
          : seasons.length,
      numberOfEpisodes:
        t.numberOfEpisodes != null ? Number(toJs(t.numberOfEpisodes)) : null,

      showType: t.showType ?? null,

      posterPath: mi.posterPath ?? null,
      backdropPath: mi.backdropPath ?? null,
      homepageUrl: mi.homepageUrl ?? null,

      genres,
      companies,
      cast,
      crew,
      seasons,
    };

    res.json(dto);
  } catch (err) {
    console.error("Neo4j GET /tv/:id error:", err);
    res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});

export default router;
