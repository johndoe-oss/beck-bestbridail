import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useVerifyResetCode, useResetPassword, useForgotPassword } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const verifyCodeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
});

const newPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type VerifyCodeFormValues = z.infer<typeof verifyCodeSchema>;
type NewPasswordFormValues = z.infer<typeof newPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [countdown, setCountdown] = useState(0);

  const verifyForm = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      email: "",
      code: "",
    },
  });

  const resetForm = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Auto-fill email from ?email= query param passed from forgot-password page
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const email = params.get('email');
    if (email) {
      verifyForm.setValue('email', email);
    }
  }, [searchString, verifyForm]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const verifyMutation = useVerifyResetCode();
  const resetMutation = useResetPassword();
  const forgotMutation = useForgotPassword();

  const onVerifyCode = (data: VerifyCodeFormValues) => {
    verifyMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Code verified", description: "Please enter your new password." });
        setStep('reset');
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Invalid code", 
          description: err?.data?.error || err?.message || "The code is invalid or expired."
        });
      }
    });
  };

  const onResetPassword = (data: NewPasswordFormValues) => {
    const email = verifyForm.getValues('email');
    const code = verifyForm.getValues('code');
    resetMutation.mutate({
      data: {
        email,
        code,
        newPassword: data.newPassword,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Password reset successful", description: "You may now log in with your new password." });
        setLocation("/login");
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Reset failed", 
          description: err?.data?.error || err?.message || "Please try again."
        });
      }
    });
  };

  const handleResend = () => {
    const email = verifyForm.getValues('email');
    if (!email) {
      toast({ 
        variant: "destructive", 
        title: "Email required", 
        description: "Please enter your email address to resend the code." 
      });
      return;
    }
    forgotMutation.mutate({ data: { email } }, {
      onSuccess: () => {
        toast({ title: "Code sent", description: "A new reset code has been sent to your email." });
        setCountdown(60);
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Failed to resend", 
          description: err?.data?.error || err?.message || "Could not send code."
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
            <Form {...verifyForm}>
              <form onSubmit={verifyForm.handleSubmit(onVerifyCode)} className="space-y-6">
                <FormField
                  control={verifyForm.control}
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
                  control={verifyForm.control}
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

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Didn't receive the code? </span>
                  <button 
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0 || forgotMutation.isPending}
                    className="font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-6">
                <FormField
                  control={resetForm.control}
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
                  control={resetForm.control}
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
