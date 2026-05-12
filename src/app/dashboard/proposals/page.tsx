
// src/app/dashboard/proposals/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Clipboard, FileText, Edit, Save, X, AlertCircle } from 'lucide-react';
import type { SavedProposal } from '@/app/lib/types';
import { getSavedProposalsAction, deleteSavedProposalAction, updateSavedProposalAction } from '@/lib/proposal-actions';
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
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function SavedProposalsPage() {
  const { data: session, status } = useSession();
  const authLoading = status === 'loading';
  const { toast } = useToast();
  const router = useRouter();

  const [proposals, setProposals] = useState<SavedProposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<SavedProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);


  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getSavedProposalsAction();
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      const userProposals = result.proposals || [];
      setProposals(userProposals);
      setFilteredProposals(userProposals);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch saved proposals.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session) {
      fetchProposals();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [session, authLoading, fetchProposals]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = proposals.filter(item =>
      item.title.toLowerCase().includes(lowercasedFilter) ||
      item.content.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredProposals(filteredData);
  }, [searchTerm, proposals]);

  const handleDeleteProposal = async (proposalId: string) => {
    try {
        const result = await deleteSavedProposalAction(proposalId);
        if (result.error) throw new Error(result.error);
        toast({ variant: "success",  title: "Proposal Deleted", description: "The saved proposal has been removed." });
        fetchProposals();
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to delete proposal.", variant: "destructive"});
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ variant: "success",  title: 'Copied!', description: 'Proposal content copied to clipboard.' });
  };

  const handleEdit = (proposal: SavedProposal) => {
    setEditingProposalId(proposal.id);
    setEditedTitle(proposal.title);
    setEditedContent(proposal.content);
  };

  const handleCancelEdit = () => {
    setEditingProposalId(null);
    setEditedTitle('');
    setEditedContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingProposalId) return;

    if (!editedTitle.trim() || !editedContent.trim()) {
        toast({ title: "Cannot Save", description: "Title and content cannot be empty.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    try {
        const result = await updateSavedProposalAction(editingProposalId, {
            title: editedTitle.trim(),
            content: editedContent.trim(),
        });
        if (result.error) throw new Error(result.error);
        toast({ variant: "success",  title: "Proposal Updated", description: "Your changes have been saved." });
        setEditingProposalId(null);
        fetchProposals();
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to update proposal.", variant: "destructive"});
    } finally {
        setIsSaving(false);
    }
  }


  if (isLoading) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
            <Card>
                <CardHeader>
                    <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse mt-1"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Saved Proposals</h1>
          <p className="text-muted-foreground">Search, view, and edit your saved proposals.</p>
        </div>
        
        <Input
          type="text"
          placeholder="Search proposals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        
         <div className="space-y-6">
            {filteredProposals.length === 0 && !isLoading ? (
                <Card className="text-center p-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">
                    {searchTerm ? "No Matching Proposals" : "No Saved Proposals"}
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {searchTerm 
                        ? "Try a different search term." 
                        : "You haven't saved any proposals yet. Go to the dashboard to generate and save one."}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => router.push('/dashboard')} className="mt-4">
                      Go to Dashboard
                    </Button>
                  )}
                </Card>
            ) : (
                filteredProposals.map(proposal => (
                    <Card key={proposal.id}>
                      {editingProposalId === proposal.id ? (
                        <>
                          <CardHeader>
                            <Input
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              className="text-xl font-semibold"
                            />
                            <CardDescription className="mt-1">
                              Saved {formatDistanceToNow(new Date(proposal.createdAt), { addSuffix: true })}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="min-h-[200px]"
                            />
                            <div className="flex items-center gap-2 mt-4">
                              <Button onClick={handleSaveEdit} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                              </Button>
                              <Button variant="ghost" onClick={handleCancelEdit}>
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </>
                      ) : (
                         <>
                          <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <CardTitle className="text-xl">{proposal.title}</CardTitle>
                                <CardDescription className="mt-1">
                                  Saved {formatDistanceToNow(new Date(proposal.createdAt), { addSuffix: true })}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(proposal)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(proposal.content)}>
                                  <Clipboard className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mb-4">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>AI may make mistakes. Double-check all generated proposals.</span>
                            </div>
                            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap border-t pt-4">
                              {proposal.content}
                            </div>
                        </CardContent>
                        </>
                      )}
                    </Card>
                ))
            )}
        </div>
    </div>
  );
}
