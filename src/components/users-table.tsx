
"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toggleAdminStatus, type AdminUser } from '@/app/lib/admin-actions';
import { useToast } from '@/hooks/use-toast';

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleToggleAdmin = async (user: AdminUser) => {
    setLoadingStates(prev => ({ ...prev, [user.uid]: true }));
    try {
      const result = await toggleAdminStatus(user.uid, user.isAdmin);
      if (result.success) {
        toast({ title: "Success", description: result.message });
      } else {
        throw new Error('An unexpected error occurred.');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status.",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [user.uid]: false }));
    }
  };

  if (users.length === 0) {
    return <p className="text-muted-foreground text-center">No users found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Display Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Subscription</TableHead>
          <TableHead>Admin Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.uid}>
            <TableCell className="font-medium">{user.displayName}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge 
                variant={user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {user.subscriptionStatus}
              </Badge>
            </TableCell>
            <TableCell>
                <Badge variant={user.isAdmin ? 'default' : 'outline'}>
                    {user.isAdmin ? 'Admin' : 'User'}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAdmin(user)}
                disabled={loadingStates[user.uid]}
              >
                {loadingStates[user.uid] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : user.isAdmin ? (
                  <><ShieldOff className="mr-2 h-4 w-4" /> Revoke Admin</>
                ) : (
                  <><ShieldCheck className="mr-2 h-4 w-4" /> Make Admin</>
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
