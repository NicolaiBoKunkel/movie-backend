import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("persons")
export class PersonMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  personId!: string;

  @Column({ nullable: true })
  tmdbId?: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  gender?: number;

  @Column({ nullable: true })
  biography?: string;

  @Column({ nullable: true })
  birthDate?: Date;

  @Column({ nullable: true })
  deathDate?: Date;

  @Column({ nullable: true })
  placeOfBirth?: string;

  @Column({ nullable: true })
  profilePath?: string;

  // Actor/Crew specific data
  @Column({ nullable: true })
  actingDebutYear?: number;

  @Column({ nullable: true })
  primaryDepartment?: string;

  // Acting roles
  @Column({ type: "array", default: [] })
  actingRoles!: any[];

  // Crew roles
  @Column({ type: "array", default: [] })
  crewRoles!: any[];
}