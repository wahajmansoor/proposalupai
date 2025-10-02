
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUsers, AppUser } from "./users/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, BarChart3, FileText, Activity } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

function getInitials(name: string | null | undefined) {
  if (!name) return "U";
  const names = name.split(" ");
  if (names.length > 1 && names[1]) {
    return `${names[0][0]}${names[names.length - 1][0]}`;
  }
  return name.substring(0, 2).toUpperCase();
}

export default async function AdminDashboardPage() {
  let users: AppUser[] = [];
  let fetchError: string | null = null;
  
  try {
    users = await getUsers();
  } catch (error: any) {
    fetchError = error.message;
  }

  const totalUsers = users.length;
  const activeSubscriptions = users.filter(u => u.subscriptionStatus === 'active').length;
  const totalProposals = users.reduce((acc, user) => acc + (user.proposalCount || 0), 0);

  const recentUsers = users
    .filter(u => u.createdAt)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  if (fetchError) {
    return (
        <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[80vh]">
            <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight text-destructive">
                    Error Fetching Data
                </h3>
                <p className="text-sm text-muted-foreground">
                    {fetchError}
                </p>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">An overview of your application's key metrics.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Users with an active "Pro" plan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposals Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProposals}</div>
            <p className="text-xs text-muted-foreground">Total proposals created by all users</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Recent Signups</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">The latest users to join your application.</p>
            </div>
            <Button asChild variant="outline" size="sm">
                <Link href="/admin-portal/users">
                    View All Users <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
          {recentUsers.length > 0 ? (
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {recentUsers.map(user => (
                          <TableRow key={user.id}>
                              <TableCell>
                                  <div className="flex items-center gap-3">
                                      <Avatar className="h-9 w-9">
                                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                      </Avatar>
                                      <div className="font-medium">{user.name || "N/A"}</div>
                                  </div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                  {user.subscriptionStatus === 'active' ? (
                                      <Badge>Pro {user.subscriptionInterval}</Badge>
                                  ) : (
                                      <Badge variant="outline">{user.subscriptionStatus || 'N/A'}</Badge>
                                  )}
                              </TableCell>
                              <TableCell className="text-right">
                                  {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            ) : (
                <div className="text-center p-8 text-muted-foreground">
                    No recent user signups.
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
