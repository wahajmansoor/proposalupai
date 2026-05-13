import NextAuth, { type Session, type User } from "next-auth";
import { type JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { getCountryFromIp } from "@/app/lib/location";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("LOGIN_ATTEMPT: Missing email or password");
          throw new Error("Invalid credentials");
        }

        console.log(`LOGIN_ATTEMPT: Checking user ${credentials.email}`);
        const email = (credentials.email as string)?.toLowerCase();
        
        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          console.log(`LOGIN_ATTEMPT: User not found in DB: ${credentials.email}`);
          throw new Error("Invalid credentials");
        }

        if (!user.password) {
          console.log(`LOGIN_ATTEMPT: User has no password set (possibly OAuth user): ${credentials.email}`);
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          console.log(`LOGIN_ATTEMPT: Password mismatch for user: ${credentials.email}`);
          throw new Error("Invalid credentials");
        }

        console.log(`LOGIN_ATTEMPT: Success for user: ${credentials.email}`);
        return user as any; 
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      try {
        if (token.sub && session.user) {
          session.user.id = token.sub;

          // Fetch user from DB to get custom fields
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              name: true,
              email: true,
              image: true,
              bio: true,
              title: true,
              services: true,
              whatsapp: true,
              isFeatured: true,
              subscriptionStatus: true,
              proposalCount: true,
              proposalCredits: true,
              paddleCustomerId: true,
              paddleSubscriptionId: true,
              subscriptionInterval: true,
              subscriptionCurrentPeriodEnd: true,
              referralCode: true,
              countryCode: true,
              countryName: true,
              emailVerified: true,
              currentSessionId: true,
            }
          });

          // Initialize new OAuth users or users missing data
          if (dbUser && (!dbUser.subscriptionCurrentPeriodEnd || !dbUser.countryCode)) {
            const updateData: any = {};
            
            if (!dbUser.subscriptionCurrentPeriodEnd && dbUser.subscriptionStatus === 'trialing') {
              const trialEndDate = new Date();
              trialEndDate.setDate(trialEndDate.getDate() + 7);
              const userReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
              
              updateData.subscriptionCurrentPeriodEnd = trialEndDate;
              updateData.referralCode = userReferralCode;
              updateData.proposalCredits = 5;
              
              dbUser.subscriptionCurrentPeriodEnd = trialEndDate;
              dbUser.referralCode = userReferralCode;
              dbUser.proposalCredits = 5;
              
              // New OAuth users are verified by default
              updateData.emailVerified = new Date();
              dbUser.emailVerified = new Date();
            }

            if (!dbUser.countryCode) {
              const headersList = await headers();
              const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || null;
              const country = await getCountryFromIp(ip);
              if (country) {
                updateData.countryCode = country.code;
                updateData.countryName = country.name;
                dbUser.countryCode = country.code;
                dbUser.countryName = country.name;
              }
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.user.update({
                where: { id: token.sub },
                data: updateData
              });
            }
          }

          if (dbUser) {
            session.user.name = dbUser.name;
            session.user.image = dbUser.image;
            session.user.bio = dbUser.bio;
            session.user.title = dbUser.title;
            session.user.services = dbUser.services;
            session.user.whatsapp = dbUser.whatsapp;
            session.user.isFeatured = dbUser.isFeatured;
            session.user.emailVerified = dbUser.emailVerified;

            // SINGLE SESSION CHECK
            if (token.sessionId && dbUser.currentSessionId !== token.sessionId) {
              console.log(`SESSION_LOCK: Invalidating session for ${dbUser.email} (ID mismatch)`);
              return null as any;
            }

            (session.user as any).profile = {
              subscriptionStatus: dbUser.subscriptionStatus,
              proposalCount: dbUser.proposalCount,
              proposalCredits: dbUser.proposalCredits,
              paddleCustomerId: dbUser.paddleCustomerId,
              paddleSubscriptionId: dbUser.paddleSubscriptionId,
              subscriptionInterval: dbUser.subscriptionInterval,
              subscriptionCurrentPeriodEnd: dbUser.subscriptionCurrentPeriodEnd,
              referralCode: dbUser.referralCode,
              country: dbUser.countryCode ? { code: dbUser.countryCode, name: dbUser.countryName || '' } : null,
            };
          }
        }
        return session;
      } catch (error) {
        console.error("SESSION_CALLBACK_ERROR:", error);
        return session; // Return partial session instead of null to avoid total lockout
      }
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.sub = user.id;
        
        // Generate new session ID on login
        const sessionId = Math.random().toString(36).substring(2, 15);
        await prisma.user.update({
          where: { id: user.id },
          data: { currentSessionId: sessionId }
        });
        token.sessionId = sessionId;
      }
      return token;
    }
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
});
