
'use server';

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function submitFeaturedRequest() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    const userId = session.user.id;

    // Check if user is Pro and has complete profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        subscriptionStatus: true,
        name: true,
        image: true,
        title: true,
        bio: true,
        services: true,
        whatsapp: true
      }
    });

    if (user?.subscriptionStatus !== 'active') {
      return { error: "Only Pro users can request to be featured." };
    }

    const isComplete = user.name && user.title && user.bio && user.image && user.whatsapp && user.services && JSON.parse(user.services).length > 0;
    if (!isComplete) {
      return { error: "Please complete your profile (Name, Image, Title, Bio, WhatsApp, and Services) before requesting." };
    }

    // Check if a pending request already exists
    const existingRequest = await prisma.featuredRequest.findFirst({
      where: { userId, status: 'pending' }
    });

    if (existingRequest) {
      return { error: "You already have a pending request." };
    }

    await prisma.featuredRequest.create({
      data: {
        userId,
        status: 'pending'
      }
    });

    revalidatePath('/profile');
    revalidatePath('/dashboard');
    return { success: "Your Request is sent and waiting for approval. You will receive more info on your email. Stay tuned!" };
  } catch (error: any) {
    console.error("Error submitting featured request:", error);
    return { error: error.message || "Failed to submit request." };
  }
}

export async function getPendingFeaturedRequests() {
  try {
    const requests = await prisma.featuredRequest.findMany({
      where: { status: 'pending' },
      include: {
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return requests;
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return [];
  }
}

export async function updateFeaturedRequestStatus(requestId: string, status: 'approved' | 'rejected') {
  try {
    const request = await prisma.featuredRequest.findUnique({
      where: { id: requestId },
      select: { userId: true }
    });

    if (!request) return { error: "Request not found" };

    await prisma.featuredRequest.update({
      where: { id: requestId },
      data: { status }
    });

    if (status === 'approved') {
      await prisma.user.update({
        where: { id: request.userId },
        data: { isFeatured: true }
      });
    }

    revalidatePath('/admin-portal/featured-requests');
    revalidatePath('/admin-portal/users');
    return { success: `Request ${status} successfully.` };
  } catch (error: any) {
    console.error("Error updating featured request status:", error);
    return { error: error.message || "Failed to update request." };
  }
}

export async function hasPendingFeaturedRequest(userId: string) {
  try {
    const request = await prisma.featuredRequest.findFirst({
      where: { userId, status: 'pending' }
    });
    return !!request;
  } catch (error) {
    console.error("Error checking pending request:", error);
    return false;
  }
}
