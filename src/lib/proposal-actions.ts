"use server";

import { cache } from 'react';
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { SavedProposal } from "@/app/lib/types";

const getAuthenticatedUserId = cache(async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
});

function toAppProposal(p: any): SavedProposal {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function getSavedProposalsAction(): Promise<{ proposals?: SavedProposal[]; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const proposals = await prisma.savedProposal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return { proposals: proposals.map(toAppProposal) };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch proposals." };
  }
}

export async function saveProposalAction(data: {
  title: string;
  content: string;
}): Promise<{ proposal?: SavedProposal; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const proposal = await prisma.savedProposal.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
      },
    });
    return { proposal: toAppProposal(proposal) };
  } catch (error: any) {
    return { error: error.message || "Failed to save proposal." };
  }
}

export async function updateSavedProposalAction(
  proposalId: string,
  data: { title?: string; content?: string }
): Promise<{ proposal?: SavedProposal; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const existing = await prisma.savedProposal.findFirst({
      where: { id: proposalId, userId },
    });
    if (!existing) {
      return { error: "Proposal not found or access denied." };
    }
    const proposal = await prisma.savedProposal.update({
      where: { id: proposalId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
      },
    });
    return { proposal: toAppProposal(proposal) };
  } catch (error: any) {
    return { error: error.message || "Failed to update proposal." };
  }
}

export async function deleteSavedProposalAction(
  proposalId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const existing = await prisma.savedProposal.findFirst({
      where: { id: proposalId, userId },
    });
    if (!existing) {
      return { error: "Proposal not found or access denied." };
    }
    await prisma.savedProposal.delete({ where: { id: proposalId } });
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete proposal." };
  }
}
