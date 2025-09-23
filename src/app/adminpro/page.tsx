
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getAllUsers } from '@/app/lib/admin-actions';
import { UsersTable } from '@/components/users-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default async function AdminDashboardPage() {
  
  const { data: users, error } = await getAllUsers().then(
    data => ({ data, error: null }),
    error => ({ data: null, error })
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">View and manage all users in the system.</p>
        </div>
      </div>
       <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>A list of all registered users and their status.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load users. Please try again later.
                </AlertDescription>
              </Alert>
            ) : (
              <UsersTable users={users || []} />
            )}
          </CardContent>
        </Card>
    </div>
  );
}
