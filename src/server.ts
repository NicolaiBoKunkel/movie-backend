import "reflect-metadata";
import "dotenv/config";
import app from "./app";
import MongoDataSource from "./db/mongoDataSource";

const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await MongoDataSource.initialize();
    console.log("MongoDB connected!");

    const server = app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });

    process.on("SIGINT", () => {
      console.log("\nshutting down...");
      server.close(() => process.exit(0));
    });

  } catch (err) {
    console.error("Failed to initialize MongoDB:", err);
    process.exit(1);
  }
}

start();
