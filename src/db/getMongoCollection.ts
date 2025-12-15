import MongoCollectionsDataSource from "./mongoCollectionsDataSource";

export const getMongoCollection = (name: string) => {
  // The native MongoClient lives here based on debug output:
  // MongoCollectionsDataSource.driver.queryRunner.databaseConnection
  const client = (MongoCollectionsDataSource as any)
    ?.driver
    ?.queryRunner
    ?.databaseConnection;

  if (!client) {
    throw new Error(
      "MongoCollectionsDataSource is not initialized OR native MongoClient not found."
    );
  }

  return client.db("collections").collection(name);
};
