import NextAuth, { type Session, type User } from "next-auth";
import { type JWT } from "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { getCountryFromIp } from "@/app/lib/location";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  providers: [
    ...authConfig.providers.filter(p => p.id !== 'credentials'),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string)?.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;
        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isPasswordValid) return null;
        return user as any;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;

        // SKIP DATABASE CHECK IN EDGE RUNTIME (Middleware)
        if (process.env.NEXT_RUNTIME === 'edge') {
          session.sessionId = token.sessionId;
          return session;
        }

        try {
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
              isActive: true,
              deactivationReason: true,
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
            session.user.isFeatured = dbUser.isFeatured;
            session.user.emailVerified = dbUser.emailVerified;

            // Check if user is active
            if (dbUser.isActive === false) {
              (session.user as any).deactivated = {
                message: dbUser.deactivationReason || "Your profile has been deactivated."
              };
            }

            // SINGLE SESSION CHECK
            if (!token.sessionId || (dbUser.currentSessionId && dbUser.currentSessionId !== token.sessionId)) {
              console.log(`SESSION_LOCK: Invalidating session for ${dbUser.email}`);
              return null as any;
            }

            (session as any).sessionId = token.sessionId;

            // Only keep basic subscription info in session to keep it small
            (session.user as any).profile = {
              subscriptionStatus: dbUser.subscriptionStatus,
              proposalCount: dbUser.proposalCount,
              proposalCredits: dbUser.proposalCredits,
              subscriptionInterval: dbUser.subscriptionInterval,
              subscriptionCurrentPeriodEnd: dbUser.subscriptionCurrentPeriodEnd,
              paddleCustomerId: dbUser.paddleCustomerId,
              paddleSubscriptionId: dbUser.paddleSubscriptionId,
              referralCode: dbUser.referralCode,
              country: dbUser.countryCode ? { code: dbUser.countryCode, name: dbUser.countryName || '' } : null,
              isActive: dbUser.isActive,
            };
          }
        } catch (error) {
          console.error("SESSION_CALLBACK_ERROR:", error);
          return session; // Return partial session instead of null to avoid total lockout
        }
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        // New login - generate new session ID
        token.sub = user.id;
        const sessionId = Math.random().toString(36).substring(2, 15);
        await prisma.user.update({
          where: { id: user.id },
          data: { currentSessionId: sessionId }
        });
        token.sessionId = sessionId;
      } else if (token.sub && !token.sessionId) {
        // Token refresh without sessionId - generate one to maintain continuity
        // This handles OAuth token refresh for Google users
        const sessionId = Math.random().toString(36).substring(2, 15);
        await prisma.user.update({
          where: { id: token.sub },
          data: { currentSessionId: sessionId }
        });
        token.sessionId = sessionId;
      }
      // If token.sub exists and token.sessionId exists, keep it as-is for session continuity
      // This ensures Google OAuth token refreshes don't invalidate the session
      return token;
    },
    async redirect({ url, baseUrl }) {
      // If the url is just the base or dashboard, check for admin
      // This is a bit limited since we don't have session here easily
      // But we can let the middleware or client handle the specific hop
      // For now, standard next-auth redirect behavior is fine if client handles it
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
});
