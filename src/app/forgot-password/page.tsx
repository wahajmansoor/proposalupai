
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { forgotPasswordAction } from '@/lib/password-actions';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            const result = await forgotPasswordAction(email);
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            } else {
                setIsSubmitted(true);
                toast({ variant: "success", title: "Email Sent", description: "If an account exists, you will receive a reset link shortly." });
            }
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Mail className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Forgot Password?</CardTitle>
                    <CardDescription className="text-center">
                        Enter your email and we'll send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Reset Link"}
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4 py-4">
                            <div className="flex justify-center">
                                <CheckCircle className="h-12 w-12 text-green-500" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Check your inbox! We've sent password reset instructions to <strong>{email}</strong>.
                            </p>
                            <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>
                                Try another email
                            </Button>
                        </div>
                    )}
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
