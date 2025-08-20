import { Injectable } from '@nestjs/common';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SurveyService {
    constructor(private prisma: PrismaService) {}
  
    
  createSurvey(createSurveyDto: CreateSurveyDto , id: string) {
    // Set creatorId from the provided id argument
    return this.prisma.survey.create({
      data: {
        ...createSurveyDto,
        creatorId: id,
      },
    });
  }



  listSurveys( page: number , limit: number) {
    return (filters: {
      status?: 'pending' | 'live' | 'ended' | 'rejected' | 'draft';
      expireDateFrom?: Date;
      expireDateTo?: Date;
      title?: string;
      creatorId?: string;
    } = {}) => {
      const { status, expireDateFrom, expireDateTo, title , creatorId } = filters;
      return this.prisma.survey.findMany({
        where: {
          ...(status && { status }),
          ...(creatorId && { creatorId }),
          ...(title && { title: { contains: title, mode: 'insensitive' } }),
          ...(expireDateFrom || expireDateTo
            ? {
                expireDate: {
                  ...(expireDateFrom && { gte: expireDateFrom }),
                  ...(expireDateTo && { lte: expireDateTo }),
                },
              }
            : {}),
        },
        skip: (page - 1) * limit,
        take: limit,
      });
    };
  }



  listCreatorSurveys(userId: string, page: number, limit: number) {
    return (filters: {
      status?: 'pending' | 'live' | 'ended' | 'rejected' | 'draft';
      expireDateFrom?: Date;
      expireDateTo?: Date;
      title?: string;
    } = {}) => {
      const { status, expireDateFrom, expireDateTo, title } = filters;
      return this.prisma.survey.findMany({
        where: {
          creatorId: userId,
          ...(status && { status }),
          ...(title && { title: { contains: title, mode: 'insensitive' } }),
          ...(expireDateFrom || expireDateTo
            ? {
                expireDate: {
                  ...(expireDateFrom && { gte: expireDateFrom }),
                  ...(expireDateTo && { lte: expireDateTo }),
                },
              }
            : {}),
        },
        skip: (page - 1) * limit,
        take: limit,
      });
    };
  }

  listUserSurveys(userId: string) {
    return `This action returns all surveys for user ${userId}`;
  }

  getSurvey(id: string) {
    return `This action returns a #${id} survey`;
  }

  updateSurvey(id: string, updateSurveyDto: UpdateSurveyDto , userId: string) {
    return `This action updates a #${id} survey`;
  }

  deleteSurvey(id: string , userId: string) {
    return `This action removes a #${id} survey`;
  }
}
