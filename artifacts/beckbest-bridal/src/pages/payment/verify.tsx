import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type VerifyState = 'verifying' | 'success' | 'error';

export default function PaymentVerify() {
  const [state, setState] = useState<VerifyState>('verifying');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { customerToken } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('provider');
    const reference = params.get('reference');
    const sessionId = params.get('session_id');
    const orderIdParam = params.get('orderId');

    if (!provider || (!reference && !sessionId)) {
      setState('error');
      setErrorMsg('Invalid payment return URL. Please contact support.');
      return;
    }

    if (!customerToken) {
      setLocation(`/login?redirect=/payment/verify${encodeURIComponent(window.location.search)}`);
      return;
    }

    const queryParts: string[] = [`provider=${provider}`];
    if (reference) queryParts.push(`reference=${reference}`);
    if (sessionId) queryParts.push(`session_id=${sessionId}`);
    if (orderIdParam) queryParts.push(`orderId=${orderIdParam}`);

    fetch(`/api/payments/verify?${queryParts.join('&')}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    })
      .then(r => r.json())
      .then((data: { status: string; orderId?: number }) => {
        if (data.status === 'paid') {
          setOrderId(data.orderId ?? null);
          setState('success');
        } else {
          setErrorMsg('Your payment was not completed. No charge was made.');
          setState('error');
        }
      })
      .catch(() => {
        setErrorMsg('We could not verify your payment. Please contact our support team.');
        setState('error');
      });
  }, [customerToken, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {state === 'verifying' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <h1 className="font-serif text-3xl">Verifying your payment</h1>
            <p className="text-muted-foreground">Please wait while we confirm your transaction...</p>
          </motion.div>
        )}

        {state === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Confetti circles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-primary/40"
                style={{ left: `${10 + i * 11}%`, top: `${20 + (i % 3) * 15}%` }}
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: -80, opacity: 0 }}
                transition={{ duration: 1.5 + i * 0.1, delay: i * 0.08 }}
              />
            ))}

            <motion.div
              className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
            >
              <Check className="w-12 h-12 text-green-600" />
            </motion.div>

            <div>
              <h1 className="font-serif text-4xl mb-3">Payment Confirmed</h1>
              {orderId && (
                <p className="text-muted-foreground mb-1">Order <strong>#{orderId}</strong></p>
              )}
              <p className="text-muted-foreground text-sm">
                A confirmation SMS has been sent to your registered phone number.
                Our team will be in touch with your shipping details within 24 hours.
              </p>
            </div>

            <div className="bg-muted/50 border border-border p-5 text-left space-y-2 rounded">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">What happens next</p>
              <p className="text-sm flex gap-2"><span className="text-primary font-bold">1.</span> Order processing begins immediately</p>
              <p className="text-sm flex gap-2"><span className="text-primary font-bold">2.</span> You'll receive shipping details via email</p>
              <p className="text-sm flex gap-2"><span className="text-primary font-bold">3.</span> White-glove delivery at your door</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-none" onClick={() => setLocation('/products')}>
                Continue Shopping
              </Button>
              <Button className="flex-1 rounded-none" onClick={() => setLocation('/account')}>
                View My Orders
              </Button>
            </div>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <motion.div
              className="w-24 h-24 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
            >
              <AlertCircle className="w-12 h-12 text-red-500" />
            </motion.div>

            <div>
              <h1 className="font-serif text-3xl mb-3">Payment Incomplete</h1>
              <p className="text-muted-foreground text-sm">{errorMsg}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-none" onClick={() => setLocation('/products')}>
                Back to Shop
              </Button>
              <Button className="flex-1 rounded-none" onClick={() => setLocation('/account')}>
                My Orders
              </Button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
