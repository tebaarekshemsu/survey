
export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

export enum Role {
  User = 'user',
  Admin = 'admin',
  Moderator = 'moderator',
}

export class CreateUserDto {
  name: string;
  email: string;
  emailVerified?: boolean;
  deleted?: boolean;
  phone?: string;
  gender?: Gender;
  birthday?: Date;
  country?: string;
  city?: string;
  languages?: string[];
  educationLevel?: string;
  occupation?: string;
  incomeLevel?: string;
  interests?: string[];
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;

  role?: Role;
  banned?: boolean;
  banReason?: string;
  banExpires?: Date;
}
