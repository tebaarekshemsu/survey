
  import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
  import { CreateResponseDto, AnswerDto } from './dto/create-response.dto';
  import { UpdateResponseDto } from './dto/update-response.dto';
  import { PrismaService } from '../prisma/prisma.service';


  @Injectable()
  export class ResponseService {
    constructor(private prisma: PrismaService) {}

    /**
     * Get all questions and paginated answers for a given survey.
     * @param surveyId Survey ID
     * @param page Page number (default: 1)
     * @param limit Items per page (default: 10)
     * @returns Object with questions and paginated answers
     */
    async getSurveyAnswer(surveyId: string, page = 1, limit = 10 , session: any) {


      const role = session.user.role;
      const userId = session.user.id;
      // 1. Check if survey exists
      const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
      if (!survey) throw new NotFoundException('Survey not found');

      // If role is creator, check ownership
      if (role === 'creator' && survey.creatorId !== userId) {
        throw new ForbiddenException('You do not own this survey.');
      }

      // 2. Get all questions for the survey
      const questions = await this.prisma.question.findMany({
        where: { surveyId },
        orderBy: { createdAt: 'asc' }
      });

      // 3. Get paginated answers for the survey
      const skip = (page - 1) * limit;
      const [answers, total] = await Promise.all([
        this.prisma.answer.findMany({
          where: { question: { surveyId } },
          orderBy: { createdAt: 'asc' },
          skip,
          take: limit,
          include: {
            question: true,
            user: true
          }
        }),
        this.prisma.answer.count({ where: { question: { surveyId } } })
      ]);

      return {
        surveyId,
        questions,
        answers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

  async create(createResponseDto: CreateResponseDto, userId: string) {
    const { surveyId, answers } = createResponseDto;

    // 1. Check if survey exists
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new NotFoundException('Survey not found');

    // 2. Get survey target and user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // 3. Check if user already participated (from response table)
    const alreadyParticipated = await this.prisma.response.findFirst({ where: { surveyId, userId } });
    if (alreadyParticipated) throw new BadRequestException('User already responded to this survey');

    // 4. Check target criteria
    const target = survey.target as any;
    const stringSimilarity = (a: string, b: string) => {
      if (!a || !b) return 0;
      a = a.toLowerCase(); b = b.toLowerCase();
      if (a === b) return 1;
      let matches = 0;
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) matches++;
      }
      return matches / Math.max(a.length, b.length);
    };
    const arraySimilarity = (arr1: string[] = [], arr2: string[] = []) => {
      if (!arr1.length || !arr2.length) return 0;
      let maxSim = 0;
      for (const a of arr1) for (const b of arr2) maxSim = Math.max(maxSim, stringSimilarity(a, b));
      return maxSim;
    };
    // Calculate user age
    let userAge: number | undefined = undefined;
    if (user.birthday) {
      const today = new Date();
      const birthDate = new Date(user.birthday);
      userAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) userAge--;
    }
    if (target) {
      if (target.ageMin !== undefined && userAge !== undefined && userAge < target.ageMin)
        throw new ForbiddenException('User does not meet ageMin');
      if (target.ageMax !== undefined && userAge !== undefined && userAge > target.ageMax)
        throw new ForbiddenException('User does not meet ageMax');
      if (target.gender && user.gender && target.gender !== user.gender)
        throw new ForbiddenException('User does not meet gender');
      if (target.country && user.country && target.country !== user.country)
        throw new ForbiddenException('User does not meet country');
      if (target.city && user.city && target.city !== user.city)
        throw new ForbiddenException('User does not meet city');
      if (target.languages && user.languages && arraySimilarity(target.languages, user.languages) < 0.5)
        throw new ForbiddenException('User does not meet languages');
      if (target.educationLevel && user.educationLevel && stringSimilarity(target.educationLevel, user.educationLevel) < 0.5)
        throw new ForbiddenException('User does not meet educationLevel');
      if (target.occupation && user.occupation && stringSimilarity(target.occupation, user.occupation) < 0.5)
        throw new ForbiddenException('User does not meet occupation');
      if (target.incomeMin !== undefined && user.incomeLevel && !isNaN(Number(user.incomeLevel)) && Number(user.incomeLevel) < target.incomeMin)
        throw new ForbiddenException('User does not meet incomeMin');
      if (target.incomeMax !== undefined && user.incomeLevel && !isNaN(Number(user.incomeLevel)) && Number(user.incomeLevel) > target.incomeMax)
        throw new ForbiddenException('User does not meet incomeMax');
      if (target.interests && user.interests && arraySimilarity(target.interests, user.interests) < 0.5)
        throw new ForbiddenException('User does not meet interests');
    }

    // 5. For each answer, check question exists in that survey
    const questions = await this.prisma.question.findMany({ where: { surveyId } });
    const questionIds = new Set(questions.map(q => q.id));
    for (const ans of answers) {
      if (!questionIds.has(ans.questionId)) {
        throw new BadRequestException(`Question ${ans.questionId} does not exist in this survey`);
      }
    }

    // 6. Transaction: create response, answers, and transfer reward
    return this.prisma.$transaction(async (prisma) => {
      // Write to response table
      const response = await prisma.response.create({ data: { surveyId, userId } });

      // Write answers
      await Promise.all(
        answers.map(ans =>
          prisma.answer.create({
            data: {
              questionId: ans.questionId,
              userId,
              answer: ans.answer,
            },
          })
        )
      );

      // Transfer reward: decrease from creator, add to user
      const reward = survey.reward;
      // Decrease from creator
      await prisma.wallet.updateMany({
        where: { userId: survey.creatorId },
        data: { balance: { decrement: reward }, totalSpend: { increment: reward } }
      });
      // Add to user
      await prisma.wallet.updateMany({
        where: { userId },
        data: { balance: { increment: reward }, totalEarn: { increment: reward } }
      });

      return { message: 'Response submitted', responseId: response.id };
    });
  }

  findAll() {
    return `This action returns all response`;
  }

  findOne(id: number) {
    return `This action returns a #${id} response`;
  }

  update(id: number, updateResponseDto: UpdateResponseDto) {
    return `This action updates a #${id} response`;
  }

  remove(id: number) {
    return `This action removes a #${id} response`;
  }
}
