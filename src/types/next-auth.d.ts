import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      bio?: string | null;
      title?: string | null;
      services?: string | null;
      whatsapp?: string | null;
      isFeatured?: boolean;
      profile?: {
        subscriptionStatus?: string | null;
        proposalCount?: number;
        proposalCredits?: number;
        paddleCustomerId?: string | null;
        paddleSubscriptionId?: string | null;
        subscriptionInterval?: string | null;
        subscriptionCurrentPeriodEnd?: Date | null;
        referralCode?: string | null;
      };
    };
  }
}
