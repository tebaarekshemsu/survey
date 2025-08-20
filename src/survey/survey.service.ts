import { Injectable } from '@nestjs/common';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SurveyService {
    constructor(private prisma: PrismaService) {}
  

  async createSurvey(createSurveyDto: CreateSurveyDto, id: string) {
    // Extract questions and survey data
    const { questions, ...surveyData } = createSurveyDto;
    // Prepare question data (without surveyId)
    const questionsData = questions.map(q => ({
      ...q,
      order: q.order ?? 0, // Ensure order is always a number
    }));

    // Use a transaction to ensure atomicity
    return this.prisma.$transaction(async (prisma) => {
      // Create the survey first (without questions)
      const survey = await prisma.survey.create({
        data: {
          ...surveyData,
          creatorId: id,
        },
      });

      // Create each question and link to the survey
      const createdQuestions = await Promise.all(
        questionsData.map(q =>
          prisma.question.create({
            data: {
              ...q,
              surveyId: survey.id,
            },
          })
        )
      );

      // Optionally, return the survey with its questions
      return {
        ...survey,
        questions: createdQuestions,
      };
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

  async listUserSurveys(userId: string, page = 1, limit = 10) {
    // Fetch user profile
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    // Calculate user's age if birthday is present
    let userAge: number | undefined = undefined;
    if (user.birthday) {
      const today = new Date();
      const birthDate = new Date(user.birthday);
      userAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        userAge--;
      }
    }

    // Fetch all active (live) surveys
    const surveys = await this.prisma.survey.findMany({
      where: { status: 'live' },
    });

    // Filter surveys where the user matches the target criteria
    const stringSimilarity = (a: string, b: string) => {
      if (!a || !b) return 0;
      a = a.toLowerCase();
      b = b.toLowerCase();
      if (a === b) return 1;
      // Simple similarity: proportion of matching chars
      let matches = 0;
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) matches++;
      }
      return matches / Math.max(a.length, b.length);
    };

    const arraySimilarity = (arr1: string[] = [], arr2: string[] = []) => {
      if (!arr1.length || !arr2.length) return 0;
      let maxSim = 0;
      for (const a of arr1) {
        for (const b of arr2) {
          maxSim = Math.max(maxSim, stringSimilarity(a, b));
        }
      }
      return maxSim;
    };

    const userSurveys = surveys.filter(survey => {
      if (!survey.target) return true; // If no target, open to all
      let targetObj: any = survey.target;
      if (typeof targetObj !== 'object' || targetObj === null) {
        try {
          targetObj = JSON.parse(targetObj as string);
        } catch {
          return false;
        }
      }
      // Check age
      if (targetObj.ageMin !== undefined && userAge !== undefined && userAge < targetObj.ageMin) return false;
      if (targetObj.ageMax !== undefined && userAge !== undefined && userAge > targetObj.ageMax) return false;
      // Check gender
      if (targetObj.gender && user.gender && targetObj.gender !== user.gender) return false;
      // Check country
      if (targetObj.country && user.country && targetObj.country !== user.country) return false;
      // Check city
      if (targetObj.city && user.city && targetObj.city !== user.city) return false;
      // Check languages (fuzzy match)
      if (targetObj.languages && user.languages && arraySimilarity(targetObj.languages, user.languages) < 0.5) return false;
      // Check educationLevel (string similarity)
      if (targetObj.educationLevel && user.educationLevel && stringSimilarity(targetObj.educationLevel, user.educationLevel) < 0.5) return false;
      // Check occupation (string similarity)
      if (targetObj.occupation && user.occupation && stringSimilarity(targetObj.occupation, user.occupation) < 0.5) return false;
      // Check incomeLevel (range)
      if (targetObj.incomeMin !== undefined && user.incomeLevel && !isNaN(Number(user.incomeLevel)) && Number(user.incomeLevel) < targetObj.incomeMin) return false;
      if (targetObj.incomeMax !== undefined && user.incomeLevel && !isNaN(Number(user.incomeLevel)) && Number(user.incomeLevel) > targetObj.incomeMax) return false;
      // Check interests (fuzzy match)
      if (targetObj.interests && user.interests && arraySimilarity(targetObj.interests, user.interests) < 0.5) return false;
      return true;
    });

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    return userSurveys.slice(start, end);
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
