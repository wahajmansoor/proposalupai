
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUsers, AppUser } from "./users/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, FileText, Activity, XCircle, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";


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
  if (lowerStatus === 'past_due' || lowerStatus === 'unpaid') statusText = 'Payment Due';

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

export default async function AdminDashboardPage() {
  let users: AppUser[] = [];
  let fetchError: string | null = null;

  try {
    users = await getUsers();
  } catch (error: any) {
    fetchError = error.message;
  }

  const now = new Date();

  const totalUsers = users.length;
  const activeSubscriptions = users.filter(u => u.subscriptionStatus === 'active').length;
  const totalProposals = users.reduce((acc, user) => acc + (user.proposalCount || 0), 0);

  // "Canceling Soon" = active user with a scheduled cancel date (Paddle scheduled change)
  //                  OR canceled status but period end is still in the future (legacy)
  const cancelingSoon = users.filter(u => {
    // Primary: Paddle sent scheduledChange.action = 'cancel' → stored in scheduledCancelAt
    if (u.scheduledCancelAt && !isPast(new Date(u.scheduledCancelAt))) return true;
    // Fallback: status is already 'canceled' but access period hasn't ended yet
    if (u.subscriptionStatus === 'canceled' && u.subscriptionCurrentPeriodEnd && !isPast(new Date(u.subscriptionCurrentPeriodEnd))) return true;
    return false;
  });

  // "Fully Canceled" = canceled status AND period has already ended (no more access)
  const fullyCanceled = users.filter(u =>
    u.subscriptionStatus === 'canceled' &&
    !cancelingSoon.includes(u)
  );

  const recentUsers = users
    .filter(u => u.createdAt)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  if (fetchError) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[80vh]">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight text-destructive">Error Fetching Data</h3>
          <p className="text-sm text-muted-foreground">{fetchError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Alert Banners */}
      {cancelingSoon.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-300/50 bg-orange-50 dark:bg-orange-950/20 p-4">
          <Clock className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
              {cancelingSoon.length} user{cancelingSoon.length > 1 ? 's have' : ' has'} scheduled a cancellation
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Their subscription is still active but will not renew at the end of their billing period.
            </p>
          </div>
        </div>
      )}

      {fullyCanceled.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {fullyCanceled.length} user{fullyCanceled.length > 1 ? 's have' : ' has'} fully canceled their subscription
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              These users have lost access to Pro features. Consider reaching out for retention.
            </p>
          </div>
        </div>
      )}

      {/* Hero Metric */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">Total Proposals Generated</CardTitle>
          <div className="rounded-full bg-primary/20 p-2 text-primary">
            <FileText className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-5xl font-black tracking-tighter text-primary">{totalProposals.toLocaleString()}</div>
          <p className="text-sm text-primary/70 mt-1 font-medium">AI-powered proposals successfully created by all users</p>
        </CardContent>
      </Card>

      {/* Secondary Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

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

        <Card className={cn(cancelingSoon.length > 0 && "border-orange-300/50 bg-orange-50/50 dark:bg-orange-950/10")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn("text-sm font-medium", cancelingSoon.length > 0 && "text-orange-600 dark:text-orange-400")}>
              Canceling Soon
            </CardTitle>
            <Clock className={cn("h-4 w-4", cancelingSoon.length > 0 ? "text-orange-500" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", cancelingSoon.length > 0 && "text-orange-600 dark:text-orange-400")}>
              {cancelingSoon.length}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled to cancel at period end</p>
          </CardContent>
        </Card>

        <Card className={cn(fullyCanceled.length > 0 && "border-destructive/50 bg-destructive/5")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn("text-sm font-medium", fullyCanceled.length > 0 && "text-destructive")}>
              Fully Canceled
            </CardTitle>
            <XCircle className={cn("h-4 w-4", fullyCanceled.length > 0 ? "text-destructive" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", fullyCanceled.length > 0 && "text-destructive")}>
              {fullyCanceled.length}
            </div>
            <p className="text-xs text-muted-foreground">Users who lost Pro access</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {/* Recent Signups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Signups</CardTitle>
              <CardDescription className="pt-1">The latest users to join your application.</CardDescription>
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
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
                          <div className="flex flex-col">
                            <div className="font-medium">{user.name || "N/A"}</div>
                            {user.country && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                                <img src={`https://flag.vercel.app/s/${user.country.code}.svg`} alt="" className="h-2.5 w-4 rounded-[1px] object-cover" />
                                <span>{user.country.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.subscriptionInterval ? `Pro ${user.subscriptionInterval === 'month' ? 'Monthly' : 'Yearly'}` : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell><SubscriptionBadge status={user.subscriptionStatus} /></TableCell>
                      <TableCell className="text-right">
                        {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-8 text-muted-foreground">No recent user signups.</div>
            )}
          </CardContent>
        </Card>

        {/* Canceling Soon — scheduled but still active */}
        <Card className="border-orange-300/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <CardTitle>Canceling at Period End</CardTitle>
              </div>
              <CardDescription className="pt-1">
                These users still have active access but their subscription will <strong>not renew</strong>. Great time to reach out!
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin-portal/users?filter=canceled">
                View in Users <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {cancelingSoon.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Access Ends</TableHead>
                    <TableHead className="text-right">Time Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelingSoon.map(user => (
                    <TableRow key={user.id} className="bg-orange-50/50 dark:bg-orange-950/10 hover:bg-orange-100/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-orange-300/40">
                            <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{user.name || "N/A"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.subscriptionInterval ? `Pro ${user.subscriptionInterval === 'month' ? 'Monthly' : 'Yearly'}` : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {user.subscriptionCurrentPeriodEnd
                              ? format(new Date(user.subscriptionCurrentPeriodEnd), 'MMM d, yyyy')
                              : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="border-orange-300 text-orange-600 dark:text-orange-400">
                          {user.subscriptionCurrentPeriodEnd
                            ? formatDistanceToNow(new Date(user.subscriptionCurrentPeriodEnd))
                            : 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-10 text-muted-foreground flex flex-col items-center gap-3">
                <Clock className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No pending cancellations</p>
                <p className="text-xs">No users have scheduled a cancellation.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fully Canceled */}
        <Card className="border-destructive/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Fully Canceled</CardTitle>
              </div>
              <CardDescription className="pt-1">
                Users who have fully lost access to Pro features.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin-portal/users?filter=canceled">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {fullyCanceled.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Was On</TableHead>
                    <TableHead>Proposals Made</TableHead>
                    <TableHead className="text-right">Signed Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fullyCanceled.map(user => (
                    <TableRow key={user.id} className="bg-destructive/5 hover:bg-destructive/10">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-destructive/20">
                            <AvatarFallback className="bg-destructive/10 text-destructive">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{user.name || "N/A"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.subscriptionInterval ? `Pro ${user.subscriptionInterval === 'month' ? 'Monthly' : 'Yearly'}` : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{user.proposalCount || 0}</span>
                        <span className="text-xs text-muted-foreground ml-1">proposals</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-10 text-muted-foreground flex flex-col items-center gap-3">
                <XCircle className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No canceled subscriptions</p>
                <p className="text-xs">All your subscribers are still active.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
