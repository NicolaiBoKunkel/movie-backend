import neo4j, { Driver, Session } from "neo4j-driver";

class Neo4jConnection {
  private driver: Driver;
  private session: Session | null = null;

  constructor() {
    const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
    const user = process.env.NEO4J_USER || "neo4j";
    const password = process.env.NEO4J_PASSWORD || "password";

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async connect(): Promise<Session> {
    try {
      this.session = this.driver.session();
      // Test connection
      await this.session.run("RETURN 1");
      console.log("Connected to Neo4j database!");
      return this.session;
    } catch (error) {
      console.error("Failed to connect to Neo4j:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    await this.driver.close();
  }

  getSession(): Session {
    if (!this.session) {
      throw new Error("Not connected to Neo4j. Call connect() first.");
    }
    return this.session;
  }
}

export default Neo4jConnection;