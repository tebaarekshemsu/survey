import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard, Session, UserSession } from '@thallesp/nestjs-better-auth';

import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiTags, ApiOperation, ApiBody , ApiResponse } from '@nestjs/swagger';

@ApiTags('User')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}


  @UseGuards(AuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get your own profile' })
  @ApiResponse({ status: 200 })
  getProfile(@Session() session: UserSession) {
    return this.usersService.getProfile(session.session.userId);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update your profile including optional gender and birthday',
  })
  @ApiBody({ type: UpdateUserDto })

  updateProfile(@Session() session: UserSession, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(session.session.userId, dto);
  }

  // Admin routes
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/ban')
  banUser(@Param('id') id: string) {
    return this.usersService.banUser(id);
  }
}
