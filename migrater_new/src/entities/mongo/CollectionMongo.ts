import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("collections")
export class CollectionMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  collectionId!: string;

  @Column({ nullable: true })
  tmdbId?: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  overview?: string;

  @Column({ nullable: true })
  posterPath?: string;

  @Column({ nullable: true })
  backdropPath?: string;

  // Embedded movies in this collection
  @Column({ type: "array", default: [] })
  movies!: any[];
}