import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "../../generated/prisma";
import { admin } from "better-auth/plugins";
import { EmailService } from "../common/email/email.service";

const prisma = new PrismaClient();

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  emailAndPassword: {
    enabled: true, 
    requireEmailVerification: true,
  },  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      // send verification email
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
  },
  plugins: [
        admin() 
    ]
});
