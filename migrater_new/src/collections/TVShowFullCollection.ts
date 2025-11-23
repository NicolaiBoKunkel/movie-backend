export const migrateTVShowFullCollection = async (fullyNestedDocs: any[], connection: any) => {
  const tvShowFullDocs = fullyNestedDocs.filter((doc: any) => doc.mediaType === 'tv');

  if (tvShowFullDocs.length > 0) {
    await connection.db('collections').collection('tvshow_full_example').insertMany(tvShowFullDocs);
    console.log(`✓ Migrated ${tvShowFullDocs.length} fully nested TV shows to 'tvshow_full_example' collection`);
  }
};
