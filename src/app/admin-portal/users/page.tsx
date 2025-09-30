
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// This is a placeholder for the user data we will fetch from Firestore.
const users = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active', plan: 'Pro Monthly', proposals: 12, joined: '2023-10-01' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Trialing', plan: 'Pro Yearly', proposals: 3, joined: '2023-10-15' },
  { id: '3', name: 'Sam Wilson', email: 'sam@example.com', status: 'Canceled', plan: 'N/A', proposals: 25, joined: '2023-09-20' },
]

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">View and manage all users in your application.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            This is a static placeholder. In the next step, we will fetch and display real user data from your database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subscription Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Proposals Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.status}</TableCell>
                  <TableCell>{user.plan}</TableCell>
                  <TableCell className="text-right">{user.proposals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
