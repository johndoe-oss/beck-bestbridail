import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useVerifyResetCode, useResetPassword } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'verify' | 'reset'>('verify');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const verifyMutation = useVerifyResetCode();
  const resetMutation = useResetPassword();

  const onVerifyCode = (data: Omit<ResetPasswordFormValues, 'newPassword' | 'confirmPassword'>) => {
    verifyMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Code verified", description: "Please enter your new password." });
        setStep('reset');
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Invalid code", 
          description: err?.data?.message || "The code is invalid or expired." 
        });
      }
    });
  };

  const onResetPassword = (data: ResetPasswordFormValues) => {
    const { confirmPassword, ...resetData } = data;
    resetMutation.mutate({ data: resetData }, {
      onSuccess: () => {
        toast({ title: "Password reset successful", description: "You may now log in with your new password." });
        setLocation("/login");
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Reset failed", 
          description: err?.data?.message || "Please try again." 
        });
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <h2 className="mt-6 text-center font-serif text-3xl sm:text-4xl text-foreground">Reset Password</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {step === 'verify' 
            ? "Enter the 6-digit code sent to your email." 
            : "Enter your new password below."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-5 sm:px-10 shadow-sm sm:rounded-lg border border-border">
          {step === 'verify' ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onVerifyCode)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset code</FormLabel>
                      <FormControl>
                        <Input placeholder="123456" {...field} maxLength={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
                    {verifyMutation.isPending ? "Verifying..." : "Verify code"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onResetPassword)} className="space-y-6">
                <input type="hidden" {...form.register('email')} />
                <input type="hidden" {...form.register('code')} />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
                    {resetMutation.isPending ? "Resetting..." : "Reset password"}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Remember your password? </span>
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}