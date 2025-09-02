import { Controller, Post, Get, Patch, Param, Body, UseGuards, Req, Delete, Query } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { AuthGuard, Session, UserSession } from '@thallesp/nestjs-better-auth';

import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiTags, ApiOperation, ApiBody , ApiResponse , ApiQuery } from '@nestjs/swagger';


@ApiTags('Survey')
@Controller('survey')
export class SurveyController {
  constructor(private surveysService: SurveyService) {}

  /**
   * Create a new survey with questions. The request body must include survey details and an array of questions.
   * The response includes the created survey and its questions.
   *
   * @param dto Survey creation payload
   * @param session User session (creator)
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator')
  @Post()
  @ApiOperation({ summary: 'Create a new survey with questions' })
  @ApiBody({ type: CreateSurveyDto, description: 'Survey creation payload including questions' })
  @ApiResponse({ status: 201, description: 'Survey and questions created successfully.', schema: {
    example: {
      id: 'survey-uuid',
      creatorId: 'user-uuid',
      title: 'Customer Feedback',
      description: 'Survey about customer satisfaction',
      // ...other survey fields...
      questions: [
        {
          id: 'question-uuid',
          surveyId: 'survey-uuid',
          type: 'text',
          label: 'What do you think?',
          order: 0,
          // ...other question fields...
        }
      ]
    }
  } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateSurveyDto, @Session() session: UserSession) {
    return this.surveysService.createSurvey(dto, session.session.userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  @ApiOperation({ summary: 'List all surveys (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all surveys.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, min: 10, max: 50)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'live', 'ended', 'rejected', 'draft'], description: 'Survey status filter' })
  @ApiQuery({ name: 'expireDateFrom', required: false, type: String, description: 'Expire date from (ISO string)' })
  @ApiQuery({ name: 'expireDateTo', required: false, type: String, description: 'Expire date to (ISO string)' })
  @ApiQuery({ name: 'title', required: false, type: String, description: 'Survey title filter' })
  @ApiQuery({ name: 'creatorId', required: false, type: String, description: 'Creator ID filter' })
  listAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?:  'live' | 'ended' | 'draft',
    @Query('expireDateFrom') expireDateFrom?: string,
    @Query('expireDateTo') expireDateTo?: string,
    @Query('title') title?: string,
    @Query('creatorId') creatorId?: string
  ) {
    const filters = {
      status,
      expireDateFrom: expireDateFrom ? new Date(expireDateFrom) : undefined,
      expireDateTo: expireDateTo ? new Date(expireDateTo) : undefined,
      title,
      creatorId
    };
  const safeLimit = Math.max(10, Math.min(+limit, 50));
  return this.surveysService.listSurveys(+page, safeLimit)(filters);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator')
  @Get('creator')
  @ApiOperation({ summary: 'List surveys created by the current creator' })
  @ApiResponse({ status: 200, description: 'List of creator surveys.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, min: 10, max: 50)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'live', 'ended', 'rejected', 'draft'], description: 'Survey status filter' })
  @ApiQuery({ name: 'expireDateFrom', required: false, type: String, description: 'Expire date from (ISO string)' })
  @ApiQuery({ name: 'expireDateTo', required: false, type: String, description: 'Expire date to (ISO string)' })
  @ApiQuery({ name: 'title', required: false, type: String, description: 'Survey title filter' })
  listCreatorSurvey(
    @Session() session: UserSession,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?:  'live' | 'ended' | 'draft',
    @Query('expireDateFrom') expireDateFrom?: string,
    @Query('expireDateTo') expireDateTo?: string,
    @Query('title') title?: string
  ) {
    const filters = {
      status,
      expireDateFrom: expireDateFrom ? new Date(expireDateFrom) : undefined,
      expireDateTo: expireDateTo ? new Date(expireDateTo) : undefined,
      title,
    };
  const safeLimit = Math.max(10, Math.min(+limit, 50));
      console.log(session)

  return this.surveysService.listCreatorSurveys(session.session.userId, +page, safeLimit)(filters);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @Get('user')
  @ApiOperation({ summary: 'List surveys available to the current user' })
  @ApiResponse({ status: 200, description: 'List of user surveys.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, min: 1, max: 50)' })
  listUserSurveys(
    @Session() session: UserSession,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    const safePage = Math.max(1, +page || 1);
    const safeLimit = Math.max(1, Math.min(+limit || 10, 50));
    return this.surveysService.listUserSurveys(session.session.userId, safePage, safeLimit);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get a survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey details.' })
  @ApiResponse({ status: 404, description: 'Survey not found.' })
  get(@Param('id') id: string) {
    return this.surveysService.getSurvey(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a survey by ID' })
  @ApiBody({ type: UpdateSurveyDto, description: 'Survey update payload' })
  @ApiResponse({ status: 200, description: 'Survey updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Survey not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateSurveyDto, @Session() session: UserSession) {
    console.log(session)
    return this.surveysService.updateSurvey(id, dto, session.session.userId);
  }


  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @Delete(':id/delete')
  @ApiOperation({ summary: 'Delete a survey by ID (soft delete)' })
  @ApiResponse({ status: 200, description: 'Survey deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Survey not found.' })
  removeSurvey(@Param('id') id: string, @Session() session: UserSession) {
    // return this.surveysService.deleteSurvey(id, session.session.userId);
  }

  /**
   * Update the status of a survey. Admins can approve/reject. Creators can change draft to live.
   * @param id Survey ID
   * @param body { status: string }
   * @param session User session
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'creator')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update survey status (admin: approve/reject, creator: draft → live)' })
  @ApiBody({ schema: { example: { status: 'live' } }, description: 'New status for the survey' })
  @ApiResponse({ status: 200, description: 'Survey status updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Survey not found.' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'live' | 'ended' | 'draft',
    @Session() session: any,
  ) {
    // Try to get user role from request.user (populated by AuthGuard), fallback to session.session.role
    const userId = session.session?.userId;
    return this.surveysService.updateSurveyStatus(id, status, userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve survey  (admin: accepted/declined)' })
  @ApiBody({ schema: { example: { status: 'accepted' } }, description: 'New status for the survey' })
  @ApiBody({ schema: { example: { reason: 'not enough reward' } }, description: 'reason if it is declined' })
  @ApiResponse({ status: 200, description: 'Survey status updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Survey not found.' })
  async approve(
    @Param('id') id: string,
    @Body('status') status: 'accepted'| 'declined' ,
    @Body('reason') reason: string
  ) {
    // Try to get user role from request.user (populated by AuthGuard), fallback to session.session.role

    return this.surveysService.approveSurvey(id, status, reason);
  }

}


