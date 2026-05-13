import { type DefaultSession } from "next-auth";
import { type JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      bio?: string | null;
      title?: string | null;
      services?: string | null;
      whatsapp?: string | null;
      isFeatured?: boolean;
      emailVerified?: Date | null;
      profile?: {
        subscriptionStatus?: string | null;
        proposalCount?: number;
        proposalCredits?: number;
        paddleCustomerId?: string | null;
        paddleSubscriptionId?: string | null;
        subscriptionInterval?: string | null;
        subscriptionCurrentPeriodEnd?: Date | null;
        referralCode?: string | null;
        country?: { code: string; name: string } | null;
      };
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    bio?: string | null;
    title?: string | null;
    services?: string | null;
    whatsapp?: string | null;
    isFeatured?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    sessionId?: string;
  }
}
