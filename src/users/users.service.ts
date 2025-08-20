import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class UsersService {

  constructor(private prisma: PrismaService) {}

  getProfile(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  updateProfile(userId: string, dto: UpdateUserDto) {
    // Map enum fields to Prisma update format if present
    const data: any = { ...dto };
    if (dto.gender !== undefined) {
      data.gender = { set: dto.gender };
    }
    if (dto.role !== undefined) {
      data.role = { set: dto.role };
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  banUser(id: string) {
    return `This action bans a #${id} user`;
  }
}
