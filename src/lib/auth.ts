import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "../../generated/prisma";
import { admin,customSession } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { EmailService } from "../common/email/email.service";

const prisma = new PrismaClient();

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-up/email') {
        console.log('User role coming from frontend', ctx.body.role);
        const { role, ...userData } = ctx.body || {};
        if (role && !['user', 'creator'].includes(role)) {
          throw new APIError('BAD_REQUEST', {
            message: 'Invalid role. Must be one of: user, creator',
          });
        }

        // Store the role in the request context for later use
        ctx.context.customRole = role || 'user';

        // Remove role from body to prevent it from being processed by better-auth
        return {
          context: {
            ...ctx.context,
            body: userData,
          },
        };
      }
    }),

    after: createAuthMiddleware(async (ctx )=>{

      if (ctx.path === "/sign-up/email" || 
        ctx.path === "/sign-in/email"
      ){
        const userId = ctx.context.returned?.user?.id;
        if (userId){
          const user = await prisma.user.findUnique({
            where: {id: userId},
            select: {role: true},
          });
          ctx.context.returned.user.role = user?.role;
        }
      }
    }),
  },

  // Database hooks to intercept role assignment at the database level
  databaseHooks: {
    user: {
      create: {
        before: async (userData, ctx) => {
          // Get the custom role from request context
          const customRole = ctx?.context?.customRole || 'user';

          console.log('Database hook - Setting role:', customRole);

          // Override the role in the user data before it's saved
          return {
            data: {
              ...userData,
              role: customRole,
            },
          };
        },
      },
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  user: {
  additionalFields: {
    role: {
      type: "string",
      required: true,
      input: true, // role should not be passed directly from frontend
    },
  },
},

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
        admin(), 
    ]
});
