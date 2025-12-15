import { DataSource } from "typeorm";

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://root:password@localhost:27018/movie_db_mongo?authSource=admin";

const collectionsUri = mongoUri.replace(/\/[^\/\?]+(\?|$)/, "/collections$1");

export const MongoCollectionsDataSource = new DataSource({
  type: "mongodb",
  url: process.env.MONGODB_COLLECTIONS_URI || collectionsUri,
  entities: [],
  synchronize: false,
  logging: false,
});

export default MongoCollectionsDataSource;
