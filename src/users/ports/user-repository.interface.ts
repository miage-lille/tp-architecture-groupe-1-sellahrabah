import { User } from 'src/users/entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
