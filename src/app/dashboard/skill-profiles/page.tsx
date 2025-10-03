
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
import type { SkillProfile } from '@/app/lib/types';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const tones = ["Professional", "Friendly", "Assertive", "Persuasive", "Creative", "Concise", "Formal"];
const lengths = ["Very Short", "Short", "Detailed", "Very Detailed"];

export default function SkillProfilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<SkillProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SkillProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SkillProfile | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userProfiles = await getSkillProfiles(user.uid);
      setProfiles(userProfiles);
      if (userProfiles.length > 0) {
        setSelectedProfile(userProfiles[0]);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch profiles.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchProfiles]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      experience: Number(formData.get('experience')),
      keywords: (formData.get('keywords') as string).split(',').map(k => k.trim()).filter(Boolean),
      links: (formData.get('links') as string).split('\n').map(l => l.trim()).filter(Boolean),
      tone: formData.get('tone') as string,
      length: formData.get('length') as string,
    };
    
    // Validate URLs
    for (const link of data.links) {
        try {
            new URL(link);
        } catch (_) {
            toast({ title: "Invalid URL", description: `Please enter a valid URL: ${link}`, variant: "destructive" });
            return;
        }
    }

    setIsSaving(true);
    try {
      if (editingProfile) {
        await updateSkillProfile(user.uid, editingProfile.id, data);
        toast({ title: 'Success', description: 'Profile updated.' });
      } else {
        await addSkillProfile(user.uid, data as Omit<SkillProfile, 'id' | 'createdAt'>);
        toast({ title: 'Success', description: 'Profile created.' });
      }
      setIsFormOpen(false);
      setEditingProfile(null);
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
        setSelectedProfile(null);
      }
      fetchProfiles();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete profile.", variant: "destructive" });
    }
  };
  
  const handleEditClick = (profile: SkillProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  }
  
  const handleCreateClick = () => {
    setEditingProfile(null);
    setIsFormOpen(true);
  }

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
                        <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Create different profiles for your various skills (e.g., "Web Developer", "Graphic Designer").</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              </div>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" onClick={handleCreateClick}><Plus className="mr-2 h-4 w-4" />Create</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingProfile ? 'Edit' : 'Create'} Skill Profile</DialogTitle>
                        <DialogDescription>
                            Define a profile for a specific skill set to generate tailored proposals.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                      <div className="space-y-2">
                        <Label htmlFor="title">Profile Title</Label>
                        <Input id="title" name="title" defaultValue={editingProfile?.title} placeholder="e.g., Senior Web Developer" required />
                      </div>
                       <div className="space-y-2">
                        <Label htmlFor="experience">Experience (Years)</Label>
                        <Input id="experience" name="experience" type="number" defaultValue={editingProfile?.experience} placeholder="e.g., 5" required />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="description">Profile Description</Label>
                        <Textarea id="description" name="description" defaultValue={editingProfile?.description} placeholder="Describe your skills and experience for this profile..." className="min-h-[120px]" required />
                      </div>
                       <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="keywords">Keywords</Label>
                        <Input id="keywords" name="keywords" defaultValue={editingProfile?.keywords.join(', ')} placeholder="e.g., React, Node.js, Project Management" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tone">Proposal Tone</Label>
                        <Select name="tone" defaultValue={editingProfile?.tone || tones[0]} required>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {tones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>
                       <div className="space-y-2">
                        <Label htmlFor="length">Proposal Length</Label>
                        <Select name="length" defaultValue={editingProfile?.length || lengths[2]} required>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {lengths.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="links">Portfolio Links</Label>
                        <Textarea id="links" name="links" defaultValue={editingProfile?.links.join('\n')} placeholder="Enter one URL per line" className="min-h-[100px]" />
                      </div>
                      <DialogFooter className="md:col-span-2">
                        <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Profile'}
                        </Button>
                      </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
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
                <p className="text-sm text-muted-foreground text-center py-4">No profiles yet. Click "Create Profile" to start.</p>
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
                        <div className="flex flex-wrap gap-2">
                        {selectedProfile.links.map((link, index) => (
                             <Badge key={index} variant="outline" className="bg-purple-100 border-purple-200 text-purple-800 font-normal">
                                <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                    {link}
                                </a>
                            </Badge>
                        ))}
                        </div>
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
    </>
  );
}
