import { Router } from "express";
import { getSession } from "../../db/neo4j";
import neo4j, { Node, Record as NeoRecord } from "neo4j-driver";

const router = Router();

   //Helpers
function toJs(value: any) {
  if (neo4j.isInt(value)) return value.toNumber();
  return value ?? null;
}

   //Summary Mapper (GET /neo/tv)
function mapNeoTvSummary(props: any) {
  return {
    mediaId: String(props.mediaId),
    originalTitle: props.originalTitle ?? "",
    voteAverage: Number(props.voteAverage ?? 0),
    genres: props.genres ?? [],
  };
}

   //GET /neo/tv (List/Search)
router.get("/", async (req, res) => {
  const session = getSession();
  const search = (req.query.search as string)?.trim() ?? "";
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  try {
    let cypher = "";
    const params: any = { limit: neo4j.int(limit) };

    if (search.length > 0) {
      cypher = `
        MATCH (t:TVShow)
        OPTIONAL MATCH (t)-[:HAS_GENRE]->(g:Genre)
        WHERE toLower(t.originalTitle) CONTAINS toLower($search)
           OR toLower(t.overview) CONTAINS toLower($search)
        WITH t, collect(g.name) AS genres
        RETURN t {.*, genres: genres} AS show
        LIMIT $limit
      `;
      params.search = search;
    } else {
      cypher = `
        MATCH (t:TVShow)
        OPTIONAL MATCH (t)-[:HAS_GENRE]->(g:Genre)
        WITH t, collect(g.name) AS genres
        RETURN t {.*, genres: genres} AS show
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


   //GET /neo/tv/:id (Full Details)
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (t:TVShow {mediaId: $id})

      OPTIONAL MATCH (t)-[:HAS_GENRE]->(g:Genre)
      WITH t, collect(g.name) AS genres

      OPTIONAL MATCH (t)-[prod:PRODUCED_BY]->(c:Company)
      WITH t, genres, collect(
        CASE WHEN c IS NULL THEN null ELSE {
          companyId: c.companyId,
          name: c.name,
          role: prod.role
        }
      END) AS companies

      OPTIONAL MATCH (p:Person)-[a:ACTED_IN]->(t)
      WITH t, genres, companies, collect(
        CASE WHEN p IS NULL THEN null ELSE {
          personId: p.personId,
          name: p.name,
          characterName: a.characterName,
          castOrder: a.castOrder
        }
      END) AS cast

      OPTIONAL MATCH (p2:Person)-[w:WORKED_ON]->(t)
      WITH t, genres, companies, cast, collect(
        CASE WHEN p2 IS NULL THEN null ELSE {
          personId: p2.personId,
          name: p2.name,
          department: w.department,
          jobTitle: w.jobTitle
        }
      END) AS crew

      OPTIONAL MATCH (t)-[:HAS_SEASON]->(s:Season)
      RETURN t, genres, companies, cast, crew, collect(s) AS seasons
      LIMIT 1
      `,
      { id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "TV show not found" });
    }

    // Non-null assertion is now safe because of the length check above
    const record = result.records[0] as NeoRecord;

    const tNode = record.get("t") as Node | null;
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
          episodeNumber: Number(p.episodeNumber ?? 0),
          name: p.name ?? null,
          airDate: p.airDate ?? null,
          runtimeMinutes: p.runtimeMinutes ?? null,
          overview: p.overview ?? null,
          stillPath: p.stillPath ?? null,
        };
      });

      seasons.push({
        seasonNumber: Number(sProps.seasonNumber),
        name: sProps.name ?? null,
        airDate: sProps.airDate ?? null,
        episodeCount: Number(sProps.episodeCount ?? episodes.length),
        posterPath: sProps.posterPath ?? null,
        episodes,
      });
    }

    const dto = {
      mediaId: String(t.mediaId),
      tmdbId: String(t.tmdbId),
      mediaType: "tv" as const,

      originalTitle: t.originalTitle ?? "",
      overview: t.overview ?? null,
      originalLanguage: t.originalLanguage ?? "",
      status: t.status ?? null,

      popularity: t.popularity ?? null,
      voteAverage: Number(t.voteAverage ?? 0),
      voteCount: t.voteCount ?? null,

      firstAirDate: t.firstAirDate ?? null,
      lastAirDate: t.lastAirDate ?? null,

      inProduction: Boolean(t.inProduction),
      numberOfSeasons: t.numberOfSeasons ?? seasons.length,
      numberOfEpisodes: t.numberOfEpisodes ?? null,

      showType: t.showType ?? null,

      posterPath: t.posterPath ?? null,
      backdropPath: t.backdropPath ?? null,
      homepageUrl: t.homepageUrl ?? null,

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
