import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("genres")
export class GenreMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  genreId!: string;

  @Column()
  name!: string;

  // Associated media items
  @Column({ type: "array", default: [] })
  mediaItems!: any[];
}