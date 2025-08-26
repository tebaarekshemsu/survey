import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from "./lib/auth"; // Your Better Auth instance
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { SurveyModule } from './survey/survey.module';
import { ResponseModule } from './response/response.module';
import { PaymentModule } from './payment/payment.module';
 
@Module({
  imports: [
    AuthModule.forRoot(auth),
    UsersModule,
    PrismaModule,
    SurveyModule,
    ResponseModule,
    PaymentModule,
  ],
})
export class AppModule {}