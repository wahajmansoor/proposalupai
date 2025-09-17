// src/app/dashboard/proposals/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Clipboard, FileText } from 'lucide-react';
import { Header } from '@/components/header';
import type { SavedProposal } from '@/app/lib/types';
import { getSavedProposals, deleteSavedProposal } from '@/lib/firebase/proposals';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ProposalUpLogo } from '@/components/icons';
import { formatDistanceToNow } from 'date-fns';

export default function SavedProposalsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [proposals, setProposals] = useState<SavedProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProposals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userProposals = await getSavedProposals(user.uid);
      setProposals(userProposals);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch saved proposals.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchProposals();
    }
  }, [user, authLoading, router, fetchProposals]);

  const handleDeleteProposal = async (proposalId: string) => {
    if(!user) return;
    try {
        await deleteSavedProposal(user.uid, proposalId);
        toast({ title: "Proposal Deleted", description: "The saved proposal has been removed." });
        fetchProposals();
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete proposal.", variant: "destructive"});
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Proposal content copied to clipboard.' });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Saved Proposals</h1>
            
             <div className="space-y-6">
                {proposals.length === 0 && !isLoading ? (
                    <Card className="text-center p-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold">No Saved Proposals</h3>
                      <p className="text-muted-foreground mt-2">You haven't saved any proposals yet. Go to the dashboard to generate and save one.</p>
                       <Button onClick={() => router.push('/dashboard')} className="mt-4">
                        Go to Dashboard
                      </Button>
                    </Card>
                ) : (
                    proposals.map(proposal => (
                        <Card key={proposal.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <CardTitle className="text-xl">{proposal.title}</CardTitle>
                                    <CardDescription className="mt-1">
                                      Saved {formatDistanceToNow(new Date(proposal.createdAt), { addSuffix: true })}
                                    </CardDescription>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(proposal.content)}>
                                      <Clipboard className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently delete the "{proposal.title}" proposal. This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteProposal(proposal.id)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap border-t pt-4">
                                  {proposal.content}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

        </div>
      </main>
    </div>
  );
}
