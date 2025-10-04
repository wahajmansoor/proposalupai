
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, X, Link as LinkIcon, Edit, Info } from 'lucide-react';
import type { SkillProfile, PortfolioLink } from '@/app/lib/types';
import {
  addSkillProfile,
  deleteSkillProfile,
  getSkillProfiles,
  updateSkillProfile,
} from '@/lib/firebase/profiles';
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
  removeLink
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
}) {
  return (
      <form onSubmit={handleFormSubmit}>
        <ScrollArea className="h-[70vh] sm:h-auto sm:max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="title">Profile Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Senior Web Developer" required />
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
                          <button type="button" onClick={() => removeKeyword(keyword)} className="rounded-full hover:bg-black/10"><X className="h-3 w-3"/></button>
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
                  <Button type="button" size="sm" variant="outline" onClick={() => {
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
                      {tones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">Proposal Length</Label>
              <Select value={length} onValueChange={setLength} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                      {lengths.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(index)} className="shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLink} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add Link
              </Button>
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Profile'}
              </Button>
          </div>
        </div>
      </form>
  )
}


export default function SkillProfilesPage() {
  const { user } = useAuth();
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
    if (!user) return;
    setIsLoading(true);
    try {
      const userProfiles = await getSkillProfiles(user.uid);
      setProfiles(userProfiles);
      if (userProfiles.length > 0 && !selectedProfile) {
        setSelectedProfile(userProfiles[0]);
      } else if (selectedProfile) {
        // Refresh selected profile data
        const refreshedProfile = userProfiles.find(p => p.id === selectedProfile.id);
        setSelectedProfile(refreshedProfile || (userProfiles.length > 0 ? userProfiles[0] : null) );
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch profiles.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, selectedProfile]);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    } else {
      setIsLoading(false);
    }
  }, [user]);

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
    if (!user) return;

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
    }

    setIsSaving(true);
    try {
      if (editingProfile) {
        await updateSkillProfile(user.uid, editingProfile.id, profileData);
        toast({ title: 'Success', description: 'Profile updated.' });
      } else {
        await addSkillProfile(user.uid, profileData as Omit<SkillProfile, 'id' | 'createdAt'>);
        toast({ title: 'Success', description: 'Profile created.' });
      }
      setIsFormOpen(false);
      resetFormState();
      await fetchProfiles();
    } catch (error) {
      toast({ title: 'Error', description: `Failed to ${editingProfile ? 'update' : 'create'} profile.`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!user) return;
    try {
      await deleteSkillProfile(user.uid, profileId);
      toast({ title: "Profile Deleted", description: "The skill profile has been removed." });
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(profiles.length > 1 ? profiles.filter(p => p.id !== profileId)[0] : null);
      }
      fetchProfiles();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete profile.", variant: "destructive" });
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
    handleLinkChange, addLink, removeLink
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className='flex items-center gap-2'>
                <CardTitle className="text-lg">Profiles</CardTitle>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild><button><Info className="h-4 w-4 text-muted-foreground" /></button></TooltipTrigger>
                        <TooltipContent>
                            <p>Create different profiles for your various skills (e.g., "Web Developer", "Graphic Designer").</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              </div>
              <Button size="sm" onClick={handleCreateClick}><Plus className="mr-2 h-4 w-4" />Create</Button>
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No profiles yet. Click "Create" to start.</p>
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
                            <Button variant="outline" size="icon" onClick={() => handleEditClick(selectedProfile)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon">
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
          ) : (
            <Card className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-lg font-semibold text-muted-foreground">Select a profile to view its details</p>
                    <p className="text-sm text-muted-foreground">or create a new one to get started.</p>
                    <Button className="mt-4" onClick={handleCreateClick}><Plus className="mr-2 h-4 w-4" />Create Your First Profile</Button>
                </div>
            </Card>
          )}
        </div>
      </div>
      
      {isMobile ? (
        <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>{editingProfile ? 'Edit' : 'Create'} Skill Profile</DrawerTitle>
                    <DrawerDescription>
                        Define a profile for a specific skill set to generate tailored proposals.
                    </DrawerDescription>
                </DrawerHeader>
                <ProfileForm {...formProps} />
            </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>{editingProfile ? 'Edit' : 'Create'} Skill Profile</DialogTitle>
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

    