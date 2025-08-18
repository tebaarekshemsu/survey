import { Controller, Post, Get, Patch, Param, Body, UseGuards, Req, Delete, Query } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { AuthGuard, Session, UserSession } from '@thallesp/nestjs-better-auth';

import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiTags, ApiOperation, ApiBody , ApiResponse } from '@nestjs/swagger';


@ApiTags('Survey')
@Controller('survey')
export class SurveyController {
  constructor(private surveysService: SurveyService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator')
  @Post()
  @ApiOperation({ summary: 'Create a new survey' })
  @ApiBody({ type: CreateSurveyDto })
  @ApiResponse({ status: 201, description: 'Survey created successfully.' })
  create(@Body() dto: CreateSurveyDto, @Session() session: UserSession) {
    return this.surveysService.createSurvey(dto, session.session.userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  @ApiOperation({ summary: 'List all surveys (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all surveys.' })
  listAll(@Session() session: UserSession , @Query('page') page = 1,
    @Query('limit') limit = 20,) {
    return this.surveysService.listSurveys(session.session.userId , +page , +limit);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator')
  @Get('creator')
  @ApiOperation({ summary: 'List surveys created by the current creator' })
  @ApiResponse({ status: 200, description: 'List of creator surveys.' })
  listCreatorSurvey(@Session() session: UserSession) {
    return this.surveysService.listCreatorSurveys(session.session.userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @Get('user')
  @ApiOperation({ summary: 'List surveys available to the current user' })
  @ApiResponse({ status: 200, description: 'List of user surveys.' })
  listUserSurveys(@Session() session: UserSession) {
    return this.surveysService.listUserSurveys(session.session.userId);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get a survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey details.' })
  get(@Param('id') id: string) {
    return this.surveysService.getSurvey(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a survey by ID' })
  @ApiBody({ type: UpdateSurveyDto })
  @ApiResponse({ status: 200, description: 'Survey updated successfully.' })
  update(@Param('id') id: string, @Body() dto: UpdateSurveyDto, @Session() session: UserSession) {
    return this.surveysService.updateSurvey(id, dto, session.session.userId);
  }


  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @Delete(':id/delete')
  @ApiOperation({ summary: 'Delete a survey by ID (soft delete)' })
  @ApiResponse({ status: 200, description: 'Survey deleted successfully.' })
  removeSurvey(@Param('id') id: string, @Session() session: UserSession) {
    return this.surveysService.deleteSurvey(id, session.session.userId);
  }
}
