
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUsers, AppUser, toggleFeaturedUser } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserActions } from "./user-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, Loader2, Crown, Star, User, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { GoogleIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

function getInitials(name: string | null | undefined) {
  if (!name) return "U";
  const names = name.split(" ");
  if (names.length > 1 && names[1]) {
    return `${names[0][0]}${names[names.length - 1][0]}`;
  }
  return name.substring(0, 2).toUpperCase();
}

function SubscriptionBadge({ status }: { status: string | null }) {
  if (!status || status === 'N/A' || status === 'No Record') {
    return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
  const lowerStatus = status.toLowerCase();

  let statusText = status.charAt(0).toUpperCase() + status.slice(1);
  if (lowerStatus === 'past_due' || lowerStatus === 'unpaid') {
    statusText = 'Payment Due';
  }

  return (
    <Badge
      variant={cn({
        "default": lowerStatus === 'active',
        "trial": lowerStatus === 'trialing',
        "warning": lowerStatus === 'past_due' || lowerStatus === 'unpaid',
        "destructive": lowerStatus === 'canceled',
        "secondary": !['active', 'trialing', 'past_due', 'unpaid', 'canceled'].includes(lowerStatus)
      }) as "default" | "destructive" | "secondary" | "warning" | "trial"}
    >
      {statusText}
    </Badge>
  );
}

type SortKey = 'name' | 'email' | 'createdAt' | 'proposalCount' | 'proposalCredits';
type StatusFilter = 'all' | 'trialing' | 'active' | 'payment_due' | 'canceled' | 'na';

const filterOptions: { label: string, value: StatusFilter }[] = [
  { label: 'All Users', value: 'all' },
  { label: 'Trialing', value: 'trialing' },
  { label: 'Active', value: 'active' },
  { label: 'Payment Due', value: 'payment_due' },
  { label: 'Canceled', value: 'canceled' },
  { label: 'N/A', value: 'na' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'ascending' | 'descending' } | null>({ key: 'createdAt', direction: 'descending' });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const usersPerPage = 10;

  useEffect(() => {
    setIsMounted(true);
    // Read filter from URL if present
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get('filter') as StatusFilter;
      if (filterParam && ['all', 'trialing', 'active', 'payment_due', 'canceled', 'na'].includes(filterParam)) {
        setStatusFilter(filterParam);
      }
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error: any) {
      setFetchError(error.message);
      console.error("Error rendered on page:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: users.length,
      trialing: 0,
      active: 0,
      payment_due: 0,
      canceled: 0,
      na: 0,
    };

    for (const user of users) {
      const status = user.subscriptionStatus?.toLowerCase() || 'na';
      if (status === 'trialing') counts.trialing++;
      else if (status === 'active') counts.active++;
      else if (status === 'past_due' || status === 'unpaid') counts.payment_due++;
      else if (status === 'canceled') counts.canceled++;
      else if (status === 'n/a' || status === 'no record' || status === 'na') counts.na++;
    }
    return counts;
  }, [users]);


  const sortedAndFilteredUsers = useMemo(() => {
    let filtered = users.filter(user =>
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        const status = user.subscriptionStatus?.toLowerCase() || 'na';
        switch (statusFilter) {
          case 'trialing': return status === 'trialing';
          case 'active': return status === 'active';
          case 'payment_due': return status === 'past_due' || status === 'unpaid';
          case 'canceled': return status === 'canceled';
          case 'na': return status === 'n/a' || status === 'no record' || status === 'na';
          default: return true;
        }
      });
    }

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return filtered;
  }, [users, searchTerm, sortConfig, statusFilter]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortConfig.direction === 'ascending' ?
      <ArrowUpDown className="ml-2 h-4 w-4" /> :
      <ArrowUpDown className="ml-2 h-4 w-4" />;
  }

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedAndFilteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedAndFilteredUsers.length / usersPerPage);

  if (!isMounted) return null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">View, search, and manage all users in your application.</p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>A live list of all registered users in your application.</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
              {filterOptions.map(option => (
                <Button
                  key={option.value}
                  variant={statusFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(option.value);
                    setCurrentPage(1);
                  }}
                  className="shrink-0 dark:hover:bg-card"
                >
                  {option.label}
                  <Badge variant="secondary" className="ml-2 dark:bg-card">{statusCounts[option.value]}</Badge>
                </Button>
              ))}
            </div>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : fetchError ? (
              <div className="text-center text-destructive py-12">
                <p className="font-bold">Error Fetching Users</p>
                <p className="text-sm">{fetchError}</p>
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No users found in the database.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:hover:bg-background">
                      <TableHead>
                        <button onClick={() => requestSort('name')} className="flex items-center">
                          User {getSortIndicator('name')}
                        </button>
                      </TableHead>
                      <TableHead className="text-center">Featured</TableHead>

                      <TableHead>
                        <button onClick={() => requestSort('email')} className="flex items-center">
                          Email {getSortIndicator('email')}
                        </button>
                      </TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">
                        <button onClick={() => requestSort('proposalCredits')} className="flex items-center">
                          Credits {getSortIndicator('proposalCredits')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button onClick={() => requestSort('createdAt')} className="flex items-center">
                          Sign-up Date {getSortIndicator('createdAt')}
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button onClick={() => requestSort('proposalCount')} className="flex items-center">
                          Proposals {getSortIndicator('proposalCount')}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentUsers.map((user) => (
                      <TableRow key={user.id} className={cn(user.isActive ? "dark:hover:bg-background" : "bg-red-50 dark:bg-red-950/50")}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.image || ""} alt={user.name || ""} className="object-cover" />
                              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1">
                              <div className="font-medium flex items-center gap-2">
                                {user.name || "N/A"}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      {user.emailVerified ? (
                                        <ShieldCheck className="h-5 w-5 text-white fill-green-500" />
                                      ) : (
                                        <ShieldAlert className="h-5 w-5 text-white fill-orange-500" />
                                      )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{user.emailVerified ? "Email Verified" : "Email Unverified"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              {user.country?.code && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <img
                                      src={`https://flagcdn.com/w20/${user.country.code.toLowerCase()}.png`}
                                      alt={`${user.country.name} flag`}
                                      className="h-3 w-5 rounded-sm object-cover"
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{user.country.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={async () => {
                              const newStatus = !user.isFeatured;
                              const result = await toggleFeaturedUser(user.id, newStatus);
                              if (result.success) {
                                // Update local state for immediate feedback
                                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isFeatured: newStatus } : u));
                                toast({
                                  title: newStatus ? "User Featured" : "User Unfeatured",
                                  description: `${user.name || user.email} is ${newStatus ? 'now' : 'no longer'} featured.`,
                                  variant: "success",
                                });
                              } else {
                                toast({
                                  title: "Error",
                                  description: result.error || "Failed to update featured status.",
                                  variant: "destructive",
                                });
                              }
                            }}

                            className="focus:outline-none transition-transform active:scale-125"
                          >
                            <Crown
                              className={cn(
                                "h-5 w-5 transition-colors",
                                user.isFeatured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-400/50"
                              )}
                            />
                          </button>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.email || "N/A"}
                            {user.signInProvider === 'google.com' && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <GoogleIcon className="h-4 w-4" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Signed in with Google</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.subscriptionInterval ? (
                            <Badge variant="outline">
                              Pro {user.subscriptionInterval === 'month' ? 'Monthly' : 'Yearly'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <SubscriptionBadge status={user.subscriptionStatus} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            {user.proposalCredits}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "NA"}
                        </TableCell>
                        <TableCell className="text-center">{user.proposalCount}</TableCell>
                        <TableCell className="text-right">
                          <UserActions user={user} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {currentUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">
                    No users match your search or filter criteria.
                  </p>
                )}
              </>
            )}
          </CardContent>
          {totalPages > 1 && (
            <CardFooter>
              <div className="flex justify-between items-center w-full">
                <span className="text-sm text-muted-foreground">
                  Showing {indexOfFirstUser + 1} - {Math.min(indexOfLastUser, sortedAndFilteredUsers.length)} of {sortedAndFilteredUsers.length} users
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="dark:hover:bg-card"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="dark:hover:bg-card"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}
