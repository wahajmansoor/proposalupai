
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Loader2, CreditCard, Mail, Star } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteUser, updateUser, AppUser, createAdminCustomerPortalSession, sendPasswordResetLink, updateUserCredits } from './actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function UserActions({ user }: { user: AppUser }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSavingCredits, setIsSavingCredits] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteUser(user.id);
    if (result.success) {
      toast({ title: 'User Deleted', description: 'The user has been successfully removed.' });
      setIsDeleteDialogOpen(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsDeleting(false);
  };
  
  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateUser(formData);
    
    if (result.success) {
        toast({ title: 'User Updated', description: 'User details have been saved.' });
        setIsEditDialogOpen(false);
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSaving(false);
  }

  const handleCreditsUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingCredits(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateUserCredits(formData);
    
    if (result.success) {
        toast({ title: 'Credits Updated', description: "The user's credit balance has been updated." });
        setIsCreditsDialogOpen(false);
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSavingCredits(false);
  }


  const handleManageBilling = async () => {
    if (!user.stripeCustomerId) {
      toast({ title: 'No Billing Info', description: "This user doesn't have a Stripe customer ID.", variant: 'destructive' });
      return;
    }
    setIsManagingBilling(true);
    const formData = new FormData();
    formData.append('stripeCustomerId', user.stripeCustomerId);
    
    const result = await createAdminCustomerPortalSession(formData);
    if (result.url) {
      window.open(result.url, '_blank');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsManagingBilling(false);
  };

  const handleSendPasswordReset = async () => {
    if (!user.email) {
      toast({ title: 'No Email Found', description: "This user doesn't have an email address.", variant: 'destructive' });
      return;
    }
    setIsSendingReset(true);
    const formData = new FormData();
    formData.append('email', user.email);

    const result = await sendPasswordResetLink(formData);
    if (result.success) {
      toast({ title: 'Email Action Simulated', description: `In a real app, a password reset email would be sent to ${user.email}.` });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSendingReset(false);
    setIsPasswordResetDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsCreditsDialogOpen(true)}>
            <Star className="mr-2 h-4 w-4" />
            Manage Credits
          </DropdownMenuItem>
           <DropdownMenuItem onSelect={handleManageBilling} disabled={!user.stripeCustomerId || isManagingBilling}>
            {isManagingBilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Manage Billing
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsPasswordResetDialogOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Send Password Reset
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user "{user.name || user.email}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update the details for {user.name || user.email}.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate}>
                <input type="hidden" name="id" value={user.id} />
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" defaultValue={user.name || ''} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" name="email" type="email" defaultValue={user.email || ''} className="col-span-3" />
                    </div>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isCreditsDialogOpen} onOpenChange={setIsCreditsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Manage Credits</DialogTitle>
                <DialogDescription>Adjust the credit balance for {user.name || user.email}.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreditsUpdate}>
                <input type="hidden" name="userId" value={user.id} />
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="credits" className="text-right">Credits</Label>
                        <Input id="credits" name="credits" type="number" defaultValue={user.proposalCredits || 0} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">Reason</Label>
                        <Input id="reason" name="reason" type="text" placeholder="e.g., Admin grant" className="col-span-3" required />
                    </div>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreditsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSavingCredits}>
                        {isSavingCredits && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Credits
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Password Reset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will simulate sending a password reset link to <span className="font-semibold">{user.email}</span>. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendPasswordReset} disabled={isSendingReset}>
              {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
