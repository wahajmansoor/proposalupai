"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import type { SkillProfile, PortfolioLink } from "@/app/lib/types";

// Helper to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

// Helper to convert Prisma SkillProfile to app SkillProfile type
function toAppSkillProfile(p: any): SkillProfile {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    experience: Number(p.experience),
    keywords: Array.isArray(p.keywords) ? p.keywords : JSON.parse(p.keywords || "[]"),
    links: Array.isArray(p.links) ? p.links : JSON.parse(p.links || "[]"),
    tone: p.tone,
    length: p.length,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function getSkillProfilesAction(): Promise<{ profiles?: SkillProfile[]; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const profiles = await prisma.skillProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return { profiles: profiles.map(toAppSkillProfile) };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch skill profiles." };
  }
}

export async function addSkillProfileAction(
  data: Omit<SkillProfile, "id" | "createdAt">
): Promise<{ profile?: SkillProfile; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const profile = await prisma.skillProfile.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        experience: String(data.experience),
        keywords: data.keywords as any,
        links: data.links as any,
        tone: data.tone,
        length: data.length,
      },
    });
    return { profile: toAppSkillProfile(profile) };
  } catch (error: any) {
    return { error: error.message || "Failed to create skill profile." };
  }
}

export async function updateSkillProfileAction(
  profileId: string,
  data: Partial<Omit<SkillProfile, "id" | "createdAt">>
): Promise<{ profile?: SkillProfile; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    // Verify ownership
    const existing = await prisma.skillProfile.findFirst({
      where: { id: profileId, userId },
    });
    if (!existing) {
      return { error: "Profile not found or access denied." };
    }
    const profile = await prisma.skillProfile.update({
      where: { id: profileId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.experience !== undefined && { experience: String(data.experience) }),
        ...(data.keywords && { keywords: data.keywords as any }),
        ...(data.links && { links: data.links as any }),
        ...(data.tone && { tone: data.tone }),
        ...(data.length && { length: data.length }),
      },
    });
    return { profile: toAppSkillProfile(profile) };
  } catch (error: any) {
    return { error: error.message || "Failed to update skill profile." };
  }
}

export async function deleteSkillProfileAction(
  profileId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    // Verify ownership
    const existing = await prisma.skillProfile.findFirst({
      where: { id: profileId, userId },
    });
    if (!existing) {
      return { error: "Profile not found or access denied." };
    }
    await prisma.skillProfile.delete({ where: { id: profileId } });
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete skill profile." };
  }
}
