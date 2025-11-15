import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("media_genres")
export class MediaGenreMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  mediaId!: string;

  @Column()
  genreId!: string;

  // Embedded media item data
  @Column({ nullable: true })
  mediaItem?: any;

  // Embedded genre data
  @Column({ nullable: true })
  genre?: any;
}