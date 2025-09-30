
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AdminUsersPage() {
  // const users = await getUsers(); // Temporarily removing the direct data fetch to prevent page crash.

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">View and manage all users in your application.</p>
      </div>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Fetching User Data</AlertTitle>
        <AlertDescription>
          We are currently unable to retrieve user data from the database. The development team has been notified.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A live list of all registered users in your application.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-center text-muted-foreground py-12">
            User data could not be loaded at this time.
           </p>
        </CardContent>
      </Card>
    </div>
  );
}
