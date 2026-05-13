
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitFeaturedRequest } from '@/lib/featured-request-actions';

interface FeaturedRequestSectionProps {
  isFeatured: boolean;
  subscriptionStatus: string | null;
  isProfileComplete: boolean;
  hasPendingRequest: boolean;
}

export function FeaturedRequestSection({
  isFeatured,
  subscriptionStatus,
  isProfileComplete,
  hasPendingRequest: initialHasPendingRequest
}: FeaturedRequestSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(initialHasPendingRequest);
  const { toast } = useToast();

  useEffect(() => {
    setHasPendingRequest(initialHasPendingRequest);
  }, [initialHasPendingRequest]);

  if (isFeatured) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            Featured Status Active
          </CardTitle>
          <CardDescription>
            You are currently a featured freelancer. Your profile is being showcased on the dashboard.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (subscriptionStatus !== 'active') {
    return (
      <Card>
        <CardHeader className="md:pb-0">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-muted-foreground" />
            Get Featured
          </CardTitle>
          <CardDescription>
            Boost your visibility! Pro members can request to be featured on the main dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled variant="outline" className="rounded-full">
            Available for Pro Members
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleRequest = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitFeaturedRequest();
      if (result.success) {
        toast({
          title: "Request Submitted",
          description: result.success,
          variant: "success",
        });
        setHasPendingRequest(true);
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="md:pb-0">
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Request to be Featured
        </CardTitle>
        <CardDescription>
          As a Pro member, you can request to be featured on our main dashboard to get more project inquiries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(hasPendingRequest || initialHasPendingRequest) ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
            <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Request Pending</p>
              <p>Your Request is sent and waiting for approval. You will receive more info on your email. Stay tuned!</p>
            </div>
          </div>
        ) : (
          <>
            {!isProfileComplete && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-start gap-3 mb-4 text-sm">
                <CheckCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Profile Incomplete</p>
                  <p>Please complete your profile details (Display Name, Profile Image, Title, Bio, WhatsApp Number, and at least one Service) before you can request to be featured.</p>
                </div>
              </div>
            )}
            <Button onClick={handleRequest} disabled={isSubmitting || !isProfileComplete} className="rounded-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
