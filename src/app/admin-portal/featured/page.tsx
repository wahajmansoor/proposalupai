
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Loader2, Crown, User, Trash2, Mail, Globe, MapPin, Search, Bell, Rocket, MessageSquareQuote, Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPendingFeaturedRequests, updateFeaturedRequestStatus } from "@/lib/featured-request-actions";
import { getFeaturedUsers } from "@/lib/featured-actions";
import { toggleFeaturedUser } from "@/app/admin-portal/users/actions";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function FeaturedPage() {
  const [activeTab, setActiveTab] = useState("requests");
  const { toast } = useToast();

  // Featured Requests State
  const [requests, setRequests] = useState<any[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Featured Persons State
  const [featuredUsers, setFeaturedUsers] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    fetchFeaturedUsers();
  }, []);

  async function fetchRequests() {
    setIsRequestsLoading(true);
    try {
      const data = await getPendingFeaturedRequests();
      setRequests(data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setIsRequestsLoading(false);
    }
  }

  async function fetchFeaturedUsers() {
    setIsUsersLoading(true);
    try {
      const data = await getFeaturedUsers();
      setFeaturedUsers(data);
    } catch (error) {
      console.error("Failed to fetch featured users", error);
    } finally {
      setIsUsersLoading(false);
    }
  }

  async function handleStatusUpdate(requestId: string, status: 'approved' | 'rejected') {
    setProcessingId(requestId);
    try {
      const result = await updateFeaturedRequestStatus(requestId, status);
      if (result.success) {
        toast({
          title: "Success",
          description: result.success,
          variant: "success",
        });
        // Remove from list and refresh featured users if approved
        setRequests(prev => prev.filter(r => r.id !== requestId));
        if (status === 'approved') {
          fetchFeaturedUsers();
        }
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
        description: "Failed to update request.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRemoveFeatured(userId: string) {
    if (!confirm("Are you sure you want to remove this user from featured list?")) return;

    try {
      const result = await toggleFeaturedUser(userId, false);
      if (result.success) {
        toast({
          title: "Removed",
          description: "User is no longer featured.",
          variant: "success",
        });
        setFeaturedUsers(prev => prev.filter(u => u.id !== userId));
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
        description: "Failed to remove user.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Featured Management</h1>
        <p className="text-muted-foreground text-sm">Review incoming requests or manage currently featured freelancers.</p>
      </div>

      <Tabs defaultValue="requests" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6 dark:bg-card">
          <TabsTrigger value="requests" className="relative font-medium">
            Featured Requests
            {requests.length > 0 && (
              <Badge className="ml-2 bg-red-500 hover:bg-red-500 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold">
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="persons" className="font-medium">Featured Persons</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
<Card className="dark:border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Pending Applications</CardTitle>
              <CardDescription>
                {requests.length} users are waiting for their profile to be featured.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRequestsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-background flex items-center justify-center">
                    <Bell className="h-8 w-8 text-slate-300 dark:text-white" />
                  </div>
                  <p className="text-sm font-medium">No pending requests found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[300px]">Freelancer</TableHead>
                      <TableHead>Experience Details</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead className="text-right">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border shadow-sm">
                              <AvatarImage src={request.user.image} className="object-cover" />
                              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-sm leading-tight">{request.user.name}</p>
                              <p className="text-[11px] text-muted-foreground">{request.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                View Profile
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">Freelancer Profile</DialogTitle>
                                <DialogDescription className="text-base">
                                  Review the user's details carefully before making a decision.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-5 pt-4">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-16 w-16">
                                    <AvatarImage src={request.user.image} className="object-cover" />
                                    <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{request.user.name}</h3>
                                    <div className="flex flex-col gap-2 mt-0.5">
                                      <p className="text-base text-slate-600 dark:text-slate-400 font-medium leading-tight">
                                        {request.user.title || 'Freelancer'}
                                      </p>
                                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                          <Mail className="h-3.5 w-3.5" />
                                          {request.user.email}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm font-medium">
                                          <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                                          {request.user.whatsapp ? (
                                            <span className="text-green-600 dark:text-green-500">{request.user.whatsapp}</span>
                                          ) : (
                                            <span className="text-muted-foreground italic">Not provided</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">About</h4>
                                  <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {request.user.bio || 'No bio provided.'}
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Specializations</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {request.user.services ? (
                                      (() => {
                                        try {
                                          const services = JSON.parse(request.user.services);
                                          return Array.isArray(services) ? services.map((s: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="font-medium text-xs px-3 py-1">
                                              {s}
                                            </Badge>
                                          )) : null;
                                        } catch (e) {
                                          return null;
                                        }
                                      })()
                                    ) : <span className="text-xs text-muted-foreground italic">No services listed</span>}
                                  </div>
                                </div>
                              </div>
                              <DialogFooter className="mt-6 flex gap-2 sm:justify-end border-t pt-6">
                                <Button
                                  variant="outline"
                                  className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  disabled={processingId === request.id}
                                  onClick={() => handleStatusUpdate(request.id, 'rejected')}
                                >
                                  {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                                  Reject
                                </Button>
                                <Button
                                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                                  disabled={processingId === request.id}
                                  onClick={() => handleStatusUpdate(request.id, 'approved')}
                                >
                                  {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                  Approve
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell className="py-4 text-sm font-medium text-slate-500 whitespace-nowrap">
                          {format(new Date(request.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[11px] font-semibold bg-green-50/50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30 transition-all"
                              disabled={processingId === request.id}
                              onClick={() => handleStatusUpdate(request.id, 'approved')}
                            >
                              {processingId === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[11px] font-semibold bg-red-50/50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 transition-all"
                              disabled={processingId === request.id}
                              onClick={() => handleStatusUpdate(request.id, 'rejected')}
                            >
                              {processingId === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persons" className="space-y-4">
          {isUsersLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            </div>
          ) : featuredUsers.length === 0 ? (
<Card className="p-20 text-center rounded-lg border bg-card text-card-foreground dark:border shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-background flex items-center justify-center">
                  <Crown className="h-8 w-8 text-slate-300 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold">No Featured Users</p>
                  <p className="text-sm text-muted-foreground max-w-[300px]">Approve requests or manually feature users from the User Management page.</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredUsers.map((user) => (
<Card key={user.id} className="overflow-hidden flex flex-col h-full border-slate-200 dark:border shadow-sm rounded-3xl bg-white dark:bg-card/50 backdrop-blur-sm">
                  <CardHeader className="p-6 pb-0 md:pb-0">
                    <div className="flex justify-between items-start">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user.image} className="object-cover" />
                        <AvatarFallback><User className="h-8 w-8 text-slate-300" /></AvatarFallback>
                      </Avatar>
                      <Badge className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800 font-bold text-xs py-1 px-3 rounded-full">
                        <Crown className="h-3.5 w-3.5 mr-1.5 fill-yellow-600 dark:fill-yellow-500" /> Featured
                      </Badge>
                    </div>
                    <div className="mt-6 flex flex-col gap-2.5">
                      <CardTitle className="text-2xl font-semibold tracking-tight">{user.name}</CardTitle>
                      <div className="flex flex-col gap-1.5">
                        <div>
                          <Badge variant="outline" className="bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900 font-medium text-xs">
                            {user.title || 'Freelancer'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                        {user.whatsapp && (
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 font-medium">
                            <Phone className="h-4 w-4" />
                            {user.whatsapp}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 flex-1 space-y-5">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">
                      {user.bio || 'No bio provided.'}
                    </p>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-500">Specializations</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {user.services ? (
                          (() => {
                            try {
                              const services = JSON.parse(user.services);
                              return Array.isArray(services) ? services.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal py-1 px-2.5">{s}</Badge>
                              )) : null;
                            } catch (e) {
                              return null;
                            }
                          })()
                        ) : <span className="text-sm italic text-slate-400">No services listed</span>}
                      </div>
                    </div>
                  </CardContent>
<CardFooter className="p-5 border-t bg-slate-50/50 dark:bg-card/50 mt-auto flex justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white font-medium text-sm px-6 rounded-full shadow-sm transition-all"
                      onClick={() => handleRemoveFeatured(user.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove from Featured
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
