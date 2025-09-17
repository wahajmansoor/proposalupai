// src/app/dashboard/portfolio/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, X, Link as LinkIcon } from 'lucide-react';
import { Header } from '@/components/header';
import type { PortfolioCollection } from '@/app/lib/types';
import {
  addPortfolioCollection,
  deletePortfolioCollection,
  getPortfolioCollections,
  updatePortfolioCollection,
} from '@/lib/firebase/portfolio';
import { Badge } from '@/components/ui/badge';
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

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [collections, setCollections] = useState<PortfolioCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [newCollectionName, setNewCollectionName] = useState('');

  const fetchCollections = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userCollections = await getPortfolioCollections(user.uid);
      setCollections(userCollections);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch collections.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchCollections();
    }
  }, [user, authLoading, router, fetchCollections]);


  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCollectionName.trim()) return;

    setIsSaving(true);
    try {
      await addPortfolioCollection(user.uid, newCollectionName.trim());
      setNewCollectionName('');
      toast({ title: 'Success', description: 'Collection created.' });
      await fetchCollections();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create collection.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteCollection = async (collectionId: string) => {
    if(!user) return;
    try {
        await deletePortfolioCollection(user.uid, collectionId);
        toast({ title: "Collection Deleted", description: "The portfolio collection has been removed." });
        fetchCollections();
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete collection.", variant: "destructive"});
    }
  }
  
  const handleAddLink = async (collectionId: string, newLink: string) => {
    if (!user || !newLink.trim()) return;

    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;
    
    try {
        new URL(newLink); // Validate URL
    } catch (_) {
        toast({ title: "Invalid URL", description: "Please enter a valid URL.", variant: "destructive" });
        return;
    }

    const updatedLinks = [...collection.links, newLink.trim()];
    
    try {
        await updatePortfolioCollection(user.uid, collectionId, { links: updatedLinks });
        fetchCollections();
    } catch (error) {
        toast({ title: "Error", description: "Failed to add link.", variant: "destructive" });
    }
  };

  const handleRemoveLink = async (collectionId: string, linkToRemove: string) => {
    if(!user) return;
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    const updatedLinks = collection.links.filter(link => link !== linkToRemove);
     try {
        await updatePortfolioCollection(user.uid, collectionId, { links: updatedLinks });
        fetchCollections();
    } catch (error) {
        toast({ title: "Error", description: "Failed to remove link.", variant: "destructive" });
    }
  };

  const AddLinkForm = ({ collectionId }: { collectionId: string }) => {
    const [link, setLink] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAddLink(collectionId, link);
        setLink('');
    };
    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
            <Input 
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com"
                className="h-8"
            />
            <Button type="submit" size="sm" variant="outline">Add Link</Button>
        </form>
    );
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Collections</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Create New Collection</CardTitle>
                    <CardDescription>Organize your portfolio links into named collections.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddCollection} className="flex items-center gap-4">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="collectionName" className="sr-only">Collection Name</Label>
                            <Input 
                                id="collectionName"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder="e.g., eCommerce Websites"
                            />
                        </div>
                        <Button type="submit" disabled={isSaving || !newCollectionName.trim()}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Create
                        </Button>
                    </form>
                </CardContent>
            </Card>

             <div className="space-y-6">
                <h2 className="text-2xl font-semibold tracking-tight">Your Collections</h2>
                {collections.length === 0 && !isLoading ? (
                    <p className="text-muted-foreground">You haven't created any collections yet.</p>
                ) : (
                    collections.map(collection => (
                        <Card key={collection.id}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-xl">{collection.name}</CardTitle>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the "{collection.name}" collection and all its links. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteCollection(collection.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                  {collection.links.map((link, index) => (
                                    <li key={index} className="flex items-center justify-between group">
                                      <div className="flex items-center gap-2">
                                        <LinkIcon className="h-4 w-4 text-muted-foreground"/>
                                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                                          {link}
                                        </a>
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveLink(collection.id, link)}>
                                          <X className="h-4 w-4"/>
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                                {collection.links.length === 0 && <p className="text-sm text-muted-foreground">No links added yet.</p>}
                               <AddLinkForm collectionId={collection.id} />
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
