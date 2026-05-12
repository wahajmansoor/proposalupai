import { PrismaAdapter } from "@auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import * as bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { getCountryFromIp } from "@/app/lib/location";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return user;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
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
          }

          if (!dbUser.countryCode) {
            const headersList = headers();
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
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  pages: {
    signIn: "/login",
  }
};
