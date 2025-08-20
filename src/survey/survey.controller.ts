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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator')
  @Post()
  @ApiOperation({ summary: 'Create a new survey' })
  @ApiBody({ type: CreateSurveyDto, description: 'Survey creation payload' })
  @ApiResponse({ status: 201, description: 'Survey created successfully.' })
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
    @Query('status') status?: 'pending' | 'live' | 'ended' | 'rejected' | 'draft',
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
    @Query('status') status?: 'pending' | 'live' | 'ended' | 'rejected' | 'draft',
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
  return this.surveysService.listCreatorSurveys(session.session.userId, +page, safeLimit)(filters);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @Get('user')
  @ApiOperation({ summary: 'List surveys available to the current user' })
  @ApiResponse({ status: 200, description: 'List of user surveys.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  listUserSurveys(@Session() session: UserSession) {
    return this.surveysService.listUserSurveys(session.session.userId);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get a survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey details.' })
  @ApiResponse({ status: 404, description: 'Survey not found.' })
  get(@Param('id') id: string) {
    return this.surveysService.getSurvey(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a survey by ID' })
  @ApiBody({ type: UpdateSurveyDto, description: 'Survey update payload' })
  @ApiResponse({ status: 200, description: 'Survey updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Survey not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateSurveyDto, @Session() session: UserSession) {
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
    return this.surveysService.deleteSurvey(id, session.session.userId);
  }
}


