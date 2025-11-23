export const migrateMovieFullCollection = async (fullyNestedDocs: any[], connection: any) => {
  const movieFullDocs = fullyNestedDocs.filter((doc: any) => doc.mediaType === 'movie');

  if (movieFullDocs.length > 0) {
    await connection.db('collections').collection('movie_full_example').insertMany(movieFullDocs);
    console.log(`✓ Migrated ${movieFullDocs.length} fully nested movies to 'movie_full_example' collection`);
  }
};
