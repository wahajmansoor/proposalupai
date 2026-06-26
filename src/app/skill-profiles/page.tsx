
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, X, Link as LinkIcon, Edit, Info } from 'lucide-react';
import type { SkillProfile, PortfolioLink } from '@/app/lib/types';
import {
  addSkillProfileAction,
  deleteSkillProfileAction,
  getSkillProfilesAction,
  updateSkillProfileAction,
} from '@/lib/profile-actions';
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
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';

const tones = ["Professional", "Friendly", "Assertive", "Persuasive", "Creative", "Concise", "Formal"];
const lengths = ["Very Short", "Short", "Detailed", "Very Detailed"];

function ProfileForm({
  editingProfile,
  handleFormSubmit,
  isSaving,
  setIsFormOpen,
  title, setTitle,
  description, setDescription,
  experience, setExperience,
  keywords, setKeywords,
  keywordInput, setKeywordInput,
  links, setLinks,
  tone, setTone,
  length, setLength,
  handleKeywordKeyDown,
  removeKeyword,
  handleLinkChange,
  addLink,
  removeLink,
  isMobile
}: {
  editingProfile: SkillProfile | null;
  handleFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  setIsFormOpen: (open: boolean) => void;
  title: string; setTitle: (value: string) => void;
  description: string; setDescription: (value: string) => void;
  experience: number | ''; setExperience: (value: number | '') => void;
  keywords: string[]; setKeywords: (value: string[]) => void;
  keywordInput: string; setKeywordInput: (value: string) => void;
  links: PortfolioLink[]; setLinks: (value: PortfolioLink[]) => void;
  tone: string; setTone: (value: string) => void;
  length: string; setLength: (value: string) => void;
  handleKeywordKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  removeKeyword: (keyword: string) => void;
  handleLinkChange: (index: number, value: string) => void;
  addLink: () => void;
  removeLink: (index: number) => void;
  isMobile: boolean;
}) {
  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Profile Title</Label>
            <Input id="tour-profile-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Senior Web Developer" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Experience (Years)</Label>
            <Input id="experience" type="number" value={experience} onChange={(e) => setExperience(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 5" required />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="description">Profile Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your skills and experience for this profile..." className="min-h-[120px]" required />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md">
              {keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {keyword}
                  <button type="button" onClick={() => removeKeyword(keyword)} className="rounded-full hover:bg-black/10"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <Input
                id="keywords"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="Type keyword..."
                className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto p-0 m-0"
              />
              <Button className="dark:hover:bg-card" type="button" size="sm" variant="outline" onClick={() => {
                if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
                  setKeywords([...keywords, keywordInput.trim()]);
                }
                setKeywordInput('');
              }}>Add</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone">Proposal Tone</Label>
            <Select value={tone} onValueChange={setTone} required>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tones.map(t => <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="length">Proposal Length</Label>
            <Select value={length} onValueChange={setLength} required>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {lengths.map(l => <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-4">
            <Label>Portfolio Websites</Label>
            {links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={link.url}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(index)} className="dark:hover:bg-card shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLink} className="w-full dark:hover:bg-card">
              <Plus className="mr-2 h-4 w-4" /> Add Link
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6 border-t bg-background">
        <div className="flex justify-end gap-2">
          <Button className="dark:hover:bg-card" type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Profile'}
          </Button>
        </div>
      </div>
    </form>
  )
}


export default function SkillProfilesPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [profiles, setProfiles] = useState<SkillProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SkillProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // State for the form
  const [editingProfile, setEditingProfile] = useState<SkillProfile | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [experience, setExperience] = useState<number | ''>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [links, setLinks] = useState<PortfolioLink[]>([{ url: '' }]);
  const [tone, setTone] = useState(tones[0]);
  const [length, setLength] = useState(lengths[2]);


  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getSkillProfilesAction();
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      const userProfiles = result.profiles || [];
      setProfiles(userProfiles);
      if (userProfiles.length > 0) {
        // If a profile is already selected, keep it selected, otherwise default to the first one
        const currentSelected = userProfiles.find(p => p.id === selectedProfile?.id);
        setSelectedProfile(currentSelected || userProfiles[0]);
      } else {
        setSelectedProfile(null);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch profiles.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedProfile?.id]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfiles();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, fetchProfiles]);

  const searchParams = useSearchParams();

  // Onboarding auto-open logic removed to keep the tour simple and stable.

  const resetFormState = () => {
    setEditingProfile(null);
    setTitle('');
    setDescription('');
    setExperience('');
    setKeywords([]);
    setKeywordInput('');
    setLinks([{ url: '' }]);
    setTone(tones[0]);
    setLength(lengths[2]);
  }

  const handleEditClick = (profile: SkillProfile) => {
    setEditingProfile(profile);
    setTitle(profile.title);
    setDescription(profile.description);
    setExperience(profile.experience);
    setKeywords(profile.keywords);
    setLinks(profile.links.length > 0 ? profile.links : [{ url: '' }]);
    setTone(profile.tone);
    setLength(profile.length);
    setIsFormOpen(true);
  }

  const handleCreateClick = () => {
    resetFormState();
    setIsFormOpen(true);
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const finalLinks = links.filter(link => link.url.trim() !== '');
    for (const link of finalLinks) {
      try {
        new URL(link.url);
      } catch (_) {
        toast({ title: "Invalid URL", description: `Please enter a valid URL: ${link.url}`, variant: "destructive" });
        return;
      }
    }

    const profileData = {
      title,
      description,
      experience: Number(experience),
      keywords,
      links: finalLinks,
      tone,
      length,
    };

    setIsSaving(true);
    try {
      if (editingProfile) {
        const result = await updateSkillProfileAction(editingProfile.id, profileData);
        if (result.error) throw new Error(result.error);
        toast({ variant: "success", title: 'Success', description: 'Profile updated.' });
      } else {
        const result = await addSkillProfileAction(profileData as Omit<SkillProfile, 'id' | 'createdAt'>);
        if (result.error) throw new Error(result.error);
        toast({ variant: "success", title: 'Success', description: 'Profile created.' });
      }
      setIsFormOpen(false);
      resetFormState();
      await fetchProfiles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || `Failed to ${editingProfile ? 'update' : 'create'} profile.`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      const result = await deleteSkillProfileAction(profileId);
      if (result.error) throw new Error(result.error);
      toast({ variant: "success", title: "Profile Deleted", description: "The skill profile has been removed." });
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(profiles.length > 1 ? profiles.filter(p => p.id !== profileId)[0] : null);
      }
      fetchProfiles();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete profile.", variant: "destructive" });
    }
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(keyword => keyword !== keywordToRemove));
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index].url = value;
    setLinks(newLinks);
  };

  const addLink = () => {
    setLinks([...links, { url: '' }]);
  };

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    if (newLinks.length === 0) {
      setLinks([{ url: '' }]);
    } else {
      setLinks(newLinks);
    }
  };

  const formProps = {
    editingProfile, handleFormSubmit, isSaving, setIsFormOpen,
    title, setTitle,
    description, setDescription,
    experience, setExperience,
    keywords, setKeywords,
    keywordInput, setKeywordInput,
    links, setLinks,
    tone, setTone,
    length, setLength,
    handleKeywordKeyDown, removeKeyword,
    handleLinkChange, addLink, removeLink,
    isMobile
  };



  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skill Profiles</h1>
          <p className="text-muted-foreground">
            Create and manage different profiles to tailor your proposals for specific skills and jobs.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className='flex items-center gap-2'>
                  <CardTitle className="text-lg">Profiles</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><button><Info className="h-4 w-4 text-muted-foreground" /></button></TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Create different profiles for your various skills (e.g., "Web Developer", "Graphic Designer").</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button id="tour-create-profile-btn" size="sm" onClick={handleCreateClick} className="rounded-full"><Plus className="mr-2 h-4 w-4" />Create</Button>
              </CardHeader>
              <CardContent>
                {profiles.length > 0 ? (
                  <ul className="space-y-2">
                    {profiles.map(profile => (
                      <li key={profile.id}>
                        <button
                          className={`w-full text-left p-2 rounded-md text-sm ${selectedProfile?.id === profile.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted'}`}
                          onClick={() => setSelectedProfile(profile)}
                        >
                          {profile.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : !isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No profiles yet. Click "Create" to start.</p>
                ) : (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-9 w-full rounded-md" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-3">
            {selectedProfile ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{selectedProfile.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditClick(selectedProfile)} className="rounded-full">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="rounded-full">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the "{selectedProfile.title}" profile. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProfile(selectedProfile.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedProfile.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-semibold">Experience</p>
                      <p>{selectedProfile.experience} years</p>
                    </div>
                    <div>
                      <p className="font-semibold">Default Length</p>
                      <p>{selectedProfile.length}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Default Tone</p>
                      <p>{selectedProfile.tone}</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Websites</p>
                    <ul className="space-y-2">
                      {selectedProfile.links.map((link, index) => (
                        <li key={index}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <LinkIcon className="h-4 w-4" />
                            <span>{link.title || link.url}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : !isLoading ? (
              <Card className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-lg font-semibold text-muted-foreground">Select a profile to view its details</p>
                  <p className="text-sm text-muted-foreground">or create a new one to get started.</p>
                  <Button className="mt-4 rounded-full" onClick={handleCreateClick}><Plus className="mr-2 h-4 w-4" />Create Your First Profile</Button>
                </div>
              </Card>
            ) : (
              <Card className="h-80 overflow-hidden">
                <CardHeader className="space-y-6 md:pb-0">
                  <Skeleton className="h-8 w-1/2 bg-background" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {isMobile ? (
        <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DrawerContent className="tour-profile-dialog max-h-[90dvh] flex flex-col">
            <DrawerHeader className="text-left">
              <DrawerTitle className="tour-profile-title">{editingProfile ? 'Edit' : 'Create'} Skill Profile</DrawerTitle>
              <DrawerDescription>
                Define a profile for a specific skill set to generate tailored proposals.
              </DrawerDescription>
            </DrawerHeader>
            <ProfileForm {...formProps} />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="tour-profile-dialog sm:max-w-2xl p-0 h-[85vh] flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="tour-profile-title">{editingProfile ? 'Edit' : 'Create'} Skill Profile</DialogTitle>
              <DialogDescription>
                Define a profile for a specific skill set to generate tailored proposals.
              </DialogDescription>
            </DialogHeader>
            <ProfileForm {...formProps} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
