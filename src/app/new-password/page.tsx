
"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { resetPasswordAction } from '@/lib/password-actions';
import { useToast } from '@/hooks/use-toast';

function NewPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const { toast } = useToast();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!token) {
        return (
            <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-500" />
                </div>
                <CardTitle>Invalid Link</CardTitle>
                <CardDescription>
                    This password reset link is invalid or has expired. Please request a new one.
                </CardDescription>
                <Button asChild className="w-full">
                    <Link href="/forgot-password">Request New Link</Link>
                </Button>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
            return;
        }

        if (password.length < 8) {
            toast({ title: "Too Short", description: "Password must be at least 8 characters.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const result = await resetPasswordAction(token, password);
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            } else {
                setIsSuccess(true);
                toast({ variant: "success", title: "Success!", description: "Your password has been updated." });
                setTimeout(() => router.push('/login'), 3000);
            }
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center space-y-6 py-4">
                <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500 animate-bounce" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold">Password Updated!</h3>
                    <p className="text-sm text-muted-foreground">
                        Your password has been successfully reset. You will be redirected to the login page in a few seconds.
                    </p>
                </div>
                <Button asChild className="w-full">
                    <Link href="/login">Login Now</Link>
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                    id="password" 
                    type="password" 
                    placeholder="Min. 8 characters" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                    id="confirm-password" 
                    type="password" 
                    placeholder="Repeat your password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Reset Password"}
            </Button>
        </form>
    );
}

export default function NewPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Lock className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
                    <CardDescription className="text-center">
                        Create a strong password to secure your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                        <NewPasswordForm />
                    </Suspense>
                </CardContent>
                <CardFooter className="flex justify-center border-t p-4">
                    <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
