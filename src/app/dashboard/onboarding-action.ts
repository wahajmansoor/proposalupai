"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function completeOnboardingAction() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true } as any
    });
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error completing onboarding:", error);
    return { error: error.message || "Failed to update onboarding status" };
  }
}
