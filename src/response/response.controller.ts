import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ResponseService } from './response.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { UpdateResponseDto } from './dto/update-response.dto';
import { AuthGuard, Session, UserSession } from '@thallesp/nestjs-better-auth';

import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiTags, ApiOperation, ApiBody , ApiResponse , ApiQuery } from '@nestjs/swagger';

@ApiTags('Response')
@Controller('response')
export class ResponseController {
  constructor(private readonly responseService: ResponseService) {}

  /**
   * Submit a new response to a survey. The request body must include the surveyId and an array of answers.
   * The response includes a success message and the response ID.
   *
   * @param dto Response creation payload
   * @param session User session (respondent)
   *
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @Post()
  @ApiOperation({ summary: 'Submit a new response to a survey' })
  @ApiBody({
    type: CreateResponseDto,
    description: 'Response creation payload including answers',
    required: true,
    schema: {
      example: {
        surveyId: 'survey-uuid',
        answers: [
          { questionId: 'question-uuid-1', answer: 'Yes' },
          { questionId: 'question-uuid-2', answer: 'No' }
        ]
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Response submitted successfully.',
    schema: {
      example: {
        message: 'Response submitted',
        responseId: 'response-uuid',
        surveyId: 'survey-uuid',
        userId: 'user-uuid',
        answers: [
          { questionId: 'question-uuid-1', answer: 'Yes' },
          { questionId: 'question-uuid-2', answer: 'No' }
        ]
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request. Invalid question or already responded.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User does not fit the survey target criteria.' })
  @ApiResponse({ status: 404, description: 'Survey or user not found.' })
  create(
    @Body() dto: CreateResponseDto,
    @Session() session: UserSession
  ) {
    return this.responseService.create(dto, session.session.userId);
  }

  /**
   * Get all questions and paginated answers for a given survey.
   * Only accessible by admin or creator.
   * @param id Survey ID
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 10)
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @Get(':id')
  findSurveyQuestionsAndAnswers(
    @Param('id') id: string,
    @Body('page') page: number = 1,
    @Body('limit') limit: number = 10,
    @Session() session: UserSession
  ) {
    return this.responseService.getSurveyAnswer(id, page, limit , session);
  }


  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResponseDto: UpdateResponseDto) {
    return this.responseService.update(+id, updateResponseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.responseService.remove(+id);
  }
}
