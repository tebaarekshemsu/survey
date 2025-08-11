import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from "./lib/auth"; // Your Better Auth instance
 
@Module({
  imports: [
    AuthModule.forRoot(auth),
  ],
})
export class AppModule {}