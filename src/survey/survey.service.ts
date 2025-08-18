import { Injectable } from '@nestjs/common';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';

@Injectable()
export class SurveyService {
  createSurvey(createSurveyDto: CreateSurveyDto , id: string) {
    return 'This action adds a new survey';
  }

  listSurveys(userId: string , page: Number , limit: Number) {
    return `This action returns all surveys for user ${userId} with ${page} and limit ${limit}`;
  }

  listCreatorSurveys(userId: string) {
    return `This action returns all surveys created by user ${userId}`;
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
