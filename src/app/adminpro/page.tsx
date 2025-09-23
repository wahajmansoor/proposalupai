
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function AdminDashboardPage() {

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
            <CardDescription>A list of all registered users.</CardDescription>
          </CardHeader>
        </Card>
    </div>
  );
}
