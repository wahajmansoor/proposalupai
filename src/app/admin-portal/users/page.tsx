
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUsers, AppUser } from "./actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserActions } from "./user-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
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
                "warning": lowerStatus === 'trialing' || lowerStatus === 'past_due' || lowerStatus === 'unpaid',
                "destructive": lowerStatus === 'canceled',
                "secondary": !['active', 'trialing', 'past_due', 'unpaid', 'canceled'].includes(lowerStatus)
            }) as "default" | "destructive" | "secondary" | "warning"}
        >
            {statusText}
        </Badge>
    );
}


export default async function AdminUsersPage() {
  let users: AppUser[] = [];
  let fetchError: string | null = null;

  try {
    users = await getUsers();
  } catch (error: any) {
    fetchError = error.message;
    console.error("Error rendered on page:", error);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">View and manage all users in your application.</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A live list of all registered users in your application.</CardDescription>
        </CardHeader>
        <CardContent>
          {fetchError ? (
            <div className="text-center text-destructive py-12">
              <p className="font-bold">Error Fetching Users</p>
              <p className="text-sm">{fetchError}</p>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No users found in the database.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sign-up Date</TableHead>
                  <TableHead className="text-center">Proposals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{user.name || "N/A"}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email || "N/A"}</TableCell>
                     <TableCell>
                        {user.subscriptionInterval ? (
                            <Badge variant="outline">
                                Pro {user.subscriptionInterval === 'month' ? 'Monthly' : 'Yearly'}
                            </Badge>
                        ) : "N/A"}
                    </TableCell>
                    <TableCell>
                        <SubscriptionBadge status={user.subscriptionStatus} />
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">{user.proposalCount}</TableCell>
                    <TableCell className="text-right">
                      <UserActions user={user} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
