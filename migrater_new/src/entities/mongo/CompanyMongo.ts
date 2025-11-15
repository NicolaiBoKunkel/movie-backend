import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("companies")
export class CompanyMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  companyId!: string;

  @Column({ nullable: true })
  tmdbId?: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  originCountry?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  logoPath?: string;

  // Associated media items
  @Column({ type: "array", default: [] })
  mediaItems!: any[];
}