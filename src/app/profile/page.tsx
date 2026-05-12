
"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, KeyRound, Plus, X, Upload, Lock, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfileAction } from '@/app/lib/actions';
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
import { Skeleton } from '@/components/ui/skeleton';
import { WelcomeDialog } from '@/components/welcome-dialog';
import { FeaturedRequestSection } from '@/components/featured-request-section';
import { hasPendingFeaturedRequest } from '@/lib/featured-request-actions';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const loading = status === "loading";
  const user = session?.user;
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [services, setServices] = useState<string[]>(['']);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const completionFields = [!!displayName, !!title, !!bio, !!profileImage, !!whatsapp, services.some(s => s.trim() !== '')];
  const progress = (completionFields.filter(Boolean).length / completionFields.length) * 100;

  const isLocked = !!user?.isFeatured || hasPendingRequest;

  useEffect(() => {
    setIsMounted(true);
    // Prioritize user profile data
    if (user?.name) setDisplayName(user.name);
    if (user?.title) setTitle(user.title);
    if (user?.bio) setBio(user.bio);
    if (user?.whatsapp) setWhatsapp(user.whatsapp);
    if (user?.image) setProfileImage(user.image);
    if (user?.services) {
      try {
        setServices(JSON.parse(user.services));
      } catch (e) {
        setServices(['']);
      }
    }

    if (user?.id) {
      hasPendingFeaturedRequest(user.id).then(setHasPendingRequest);
    }
  }, [user]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    formData.append('title', title);
    formData.append('bio', bio);
    formData.append('whatsapp', whatsapp);
    formData.append('services', JSON.stringify(services));
    if (profileImage) formData.append('image', profileImage);

    const result = await updateProfileAction(formData);

    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ variant: "success", title: 'Success!', description: 'Your profile has been updated.' });
      await update(); // Refresh session
    }
    setIsSaving(false);
  };

  const handlePasswordReset = async () => {
    toast({
      variant: "success",
      title: 'Success',
      description: `Password reset instructions will be sent to your email.`,
    });
  };

  const currentName = user?.name;

  if (!isMounted || loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="grid w-full gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="grid w-full gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Skeleton className="h-10 w-32 rounded-full" />
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">General Profile</h1>
        <p className="text-muted-foreground">View and manage your account details.</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Profile Completion</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      <FeaturedRequestSection
        isFeatured={user?.isFeatured || false}
        subscriptionStatus={(user as any)?.profile?.subscriptionStatus || 'trialing'}
        isProfileComplete={progress === 100}
        hasPendingRequest={hasPendingRequest}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your personal and contact details.</CardDescription>
              </div>
              {isLocked && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
                  <Lock className="h-3 w-3" /> Profile Locked
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start mb-6">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-800">Editing is restricted</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    Your profile is currently {user?.isFeatured ? "featured" : "under review for featured status"}. To maintain profile consistency, editing is disabled during this time.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-primary/20 overflow-hidden">
                  {profileImage || user?.image ? (
                    <AvatarImage
                      src={profileImage || user?.image!}
                      alt={currentName || 'User avatar'}
                      className="object-cover w-full h-full"
                    />
                  ) : null}
                  <AvatarFallback className="text-lg font-semibold">{getInitials(currentName)}</AvatarFallback>
                </Avatar>
                <label htmlFor="image-upload" className="absolute bottom-0 right-0 p-1.5 bg-primary hover:bg-primary/90 transition-colors rounded-full cursor-pointer text-white shadow-md">
                  <Upload className="h-3 w-3" />
                </label>
                <Input
                  id="image-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 500 * 1024) {
                        toast({ title: 'Error', description: 'Image size must be less than 500KB', variant: 'destructive' });
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const base64String = reader.result as string;
                        setProfileImage(base64String);
                        toast({ variant: "success", title: 'Success!', description: 'Profile image updated locally. Save changes to persist.' });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="displayName">Display Name <span className="text-red-500">*</span></Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                disabled={isLocked}
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="bio">Bio (Introduction) <span className="text-red-500">*</span></Label>
              <Textarea
                id="bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                disabled={isLocked}
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="whatsapp">WhatsApp Number <span className="text-red-500">*</span></Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. +1234567890"
                required
                disabled={isLocked}
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="services">Services <span className="text-red-500">*</span></Label>
              <div className="space-y-2">
                {services.map((service, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={service}
                      maxLength={100}
                      disabled={isLocked}
                      onChange={(e) => {
                        const words = e.target.value.split(' ').filter(Boolean);
                        if (words.length <= 10) {
                          const newServices = [...services];
                          newServices[index] = e.target.value;
                          setServices(newServices);
                        }
                      }}
                      placeholder="e.g. Web Development (max 10 words, 100 chars)"
                    />
                    {services.length > 1 && !isLocked && (
                      <Button type="button" variant="outline" size="icon" onClick={() => setServices(services.filter((_, i) => i !== index))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {services.length < 7 && !isLocked && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setServices([...services, ''])}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button
              type="submit"
              disabled={isSaving || isLocked}
              className="rounded-full px-8"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader className="md:pb-0">
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Password</h3>
              <p className="text-sm text-muted-foreground">Reset your password via email.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-full">Reset Password</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a password reset link to your email address: <span className="font-semibold">{user?.email}</span>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePasswordReset} disabled={isSendingReset}>
                    {isSendingReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Send Link
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
