import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("media_companies")
export class MediaCompanyMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  mediaCompanyId!: string;

  @Column()
  mediaId!: string;

  @Column()
  companyId!: string;

  @Column()
  role!: string; // production | distribution | network | other

  // Embedded media item data
  @Column({ nullable: true })
  mediaItem?: any;

  // Embedded company data
  @Column({ nullable: true })
  company?: any;
}