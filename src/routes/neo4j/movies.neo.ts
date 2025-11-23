import { Router } from "express";
import { getSession } from "../../db/neo4j";

const router = Router();

router.get("/", async (req, res) => {
  const session = getSession();

  try {
    const result = await session.run(`
      MATCH (m:Movie)
      RETURN m
      LIMIT 25
    `);

    const movies = result.records.map(r => r.get("m").properties);
    res.json(movies);

  } catch (err) {
    console.error("Neo4j error:", err);
    res.status(500).json({ error: "Neo4j query failed" });

  } finally {
    await session.close();
  }
});

export default router;
