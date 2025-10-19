
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { ShareIcons } from "./icons";
import Link from "next/link";

export function ReferralDialog({
  open,
  onOpenChange,
  referralCode,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode?: string;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && referralCode) {
      setReferralLink(`${window.location.origin}/signup?invite=${referralCode}`);
    }
  }, [referralCode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setHasCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setHasCopied(false), 2000);
  };
  
  const socialShareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Check out Proposal Up! The best way to generate winning proposals.")}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent("Check out Proposal Up! The best way to generate winning proposals. " + referralLink)}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refer a Friend, Get Credits</DialogTitle>
          <DialogDescription>
            Share your link with friends. When they sign up, you'll both get 5 extra proposal improvement credits!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral-link">Your Unique Referral Link</Label>
            <div className="flex items-center gap-2">
              <Input id="referral-link" value={referralLink} readOnly />
              <Button size="icon" variant="outline" onClick={copyToClipboard}>
                {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Link href={socialShareLinks.facebook} target="_blank" passHref>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12"><ShareIcons.Facebook className="h-6 w-6" /></Button>
            </Link>
             <Link href={socialShareLinks.twitter} target="_blank" passHref>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12"><ShareIcons.Twitter className="h-6 w-6" /></Button>
            </Link>
             <Link href={socialShareLinks.linkedin} target="_blank" passHref>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12"><ShareIcons.LinkedIn className="h-6 w-6" /></Button>
            </Link>
             <Link href={socialShareLinks.whatsapp} target="_blank" passHref>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12"><ShareIcons.WhatsApp className="h-6 w-6" /></Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
