import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("movies")
export class MovieMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  mediaId!: string;

  @Column({ nullable: true })
  releaseDate?: Date;

  @Column()
  budget!: number;

  @Column()
  revenue!: number;

  @Column()
  adultFlag!: boolean;

  @Column({ nullable: true })
  runtimeMinutes?: number;

  @Column({ nullable: true })
  collectionId?: string;

  // Embedded collection data
  @Column({ nullable: true })
  collection?: any;

  // Embedded media item data
  @Column()
  mediaItem!: any;
}