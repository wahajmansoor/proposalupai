
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the control center for your application.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            This is a placeholder for your future analytics and management widgets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            From here, you will be able to manage users, view subscription data, and monitor application analytics. 
            Our next step is to build out the "Users" page to display all user information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
