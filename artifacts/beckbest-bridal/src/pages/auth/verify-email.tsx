import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useVerifyCustomerEmail, useResendVerification } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get('email') || '';
  
  const { setCustomerToken } = useAuth();
  const { toast } = useToast();
  
  const verifyMutation = useVerifyCustomerEmail();
  const resendMutation = useResendVerification();
  
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!email) {
      setLocation('/login');
    }
  }, [email, setLocation]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = () => {
    if (code.length !== 6) return;
    
    verifyMutation.mutate({ data: { email, code } }, {
      onSuccess: (res) => {
        setCustomerToken(res.token);
        toast({ title: "Email verified", description: "Welcome to Beckbest Bridal." });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Verification failed", 
          description: err?.data?.message || "Invalid or expired code." 
        });
      }
    });
  };

  const handleResend = () => {
    resendMutation.mutate({ data: { email } }, {
      onSuccess: () => {
        toast({ title: "Code sent", description: "A new verification code has been sent to your email." });
        setCountdown(60);
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Failed to resend", 
          description: err?.data?.message || "Could not send code." 
        });
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-6 text-center font-serif text-4xl text-foreground">Verify your email</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          We've sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-10 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-border flex flex-col items-center">
          
          <div className="mb-8">
            <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={handleVerify} autoFocus>
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="w-12 h-14 text-lg border-border" />
                <InputOTPSlot index={1} className="w-12 h-14 text-lg border-border" />
                <InputOTPSlot index={2} className="w-12 h-14 text-lg border-border" />
                <InputOTPSlot index={3} className="w-12 h-14 text-lg border-border" />
                <InputOTPSlot index={4} className="w-12 h-14 text-lg border-border" />
                <InputOTPSlot index={5} className="w-12 h-14 text-lg border-border" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button 
            onClick={handleVerify} 
            className="w-full mb-6" 
            disabled={code.length !== 6 || verifyMutation.isPending}
          >
            {verifyMutation.isPending ? "Verifying..." : "Verify Code"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Didn't receive the code? </span>
            <button 
              onClick={handleResend}
              disabled={countdown > 0 || resendMutation.isPending}
              className="font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
