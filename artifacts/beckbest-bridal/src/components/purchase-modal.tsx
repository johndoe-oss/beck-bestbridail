import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Truck, CreditCard, Check, AlertCircle, ArrowRight } from 'lucide-react';

interface PurchaseProduct {
  id: number;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  images?: string[];
  inStock: boolean;
}

interface PurchaseModalProps {
  product: PurchaseProduct;
  isOpen: boolean;
  /** Only called when user explicitly chooses "Continue Shopping" after a COD success */
  onClose: () => void;
}

type ModalState = 'selection' | 'address' | 'processing' | 'confirmation' | 'success' | 'error';
type PaymentProvider = 'cod' | 'paystack' | 'stripe';

const providerLabels: Record<PaymentProvider, string> = {
  cod: 'Cash on Delivery',
  paystack: 'Paystack',
  stripe: 'Stripe',
};

export function PurchaseModal({ product, isOpen, onClose }: PurchaseModalProps) {
  const [state, setState] = useState<ModalState>('selection');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const { customerToken } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const resetAndClose = useCallback(() => {
    setState('selection');
    setSelectedProvider(null);
    setShippingAddress('');
    setNotes('');
    setOrderId(null);
    setErrorMessage('');
    setPaymentUrl('');
    setTotalAmount(0);
    onClose();
  }, [onClose]);

  const initiatePayment = useCallback(async (provider: PaymentProvider) => {
    if (!customerToken) {
      toast({ title: 'Login required', description: 'Please log in to complete your purchase.' });
      setLocation('/login');
      onClose();
      return;
    }

    setSelectedProvider(provider);
    setState('processing');

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          provider,
          productId: product.id,
          quantity: 1,
          fromCart: false,
          shippingAddress: shippingAddress || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
        setState('error');
        return;
      }

      if (provider === 'cod') {
        setOrderId(data.orderId);
        setState('success');
        return;
      }

      // For online payments — show confirmation before redirecting
      if (provider === 'paystack' && data.authorizationUrl) {
        setOrderId(data.orderId ?? null);
        setTotalAmount(data.totalAmount ?? product.price);
        setPaymentUrl(data.authorizationUrl);
        setState('confirmation');
        return;
      }

      if (provider === 'stripe' && data.checkoutUrl) {
        setOrderId(data.orderId ?? null);
        setTotalAmount(data.totalAmount ?? product.price);
        setPaymentUrl(data.checkoutUrl);
        setState('confirmation');
        return;
      }

      setErrorMessage('Payment provider response was unexpected.');
      setState('error');
    } catch (err) {
      setErrorMessage('Network error. Please check your connection and try again.');
      setState('error');
    }
  }, [customerToken, product, shippingAddress, notes, toast, setLocation, onClose]);

  const handleProceedToPay = () => {
    if (paymentUrl) {
      window.location.href = paymentUrl;
    }
  };

  const handleProviderSelect = (provider: PaymentProvider) => {
    setState('address');
    setSelectedProvider(provider);
  };

  const handleConfirm = () => {
    if (selectedProvider) initiatePayment(selectedProvider);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop — no click-to-close */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 bg-background w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* Processing Overlay */}
            <AnimatePresence>
              {state === 'processing' && (
                <motion.div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="relative w-24 h-24 mb-8">
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/20"
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute inset-3 rounded-full border border-t-primary/40 border-r-transparent border-b-transparent border-l-primary/40"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                  <p className="font-serif text-xl text-foreground">Please wait...</p>
                  <p className="text-sm text-muted-foreground mt-2">Do not close this window</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirmation State — show order details before redirecting to pay */}
            {state === 'confirmation' && selectedProvider && (
              <div className="p-8 text-center">
                <motion.div
                  className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                >
                  {selectedProvider === 'paystack' ? (
                    <span className="text-2xl font-bold text-[#00c3f7]">PS</span>
                  ) : (
                    <CreditCard className="w-10 h-10 text-[#635bff]" />
                  )}
                </motion.div>

                <h2 className="font-serif text-3xl mb-2">Ready to Pay</h2>
                <p className="text-muted-foreground mb-6">
                  You will be redirected to <strong>{providerLabels[selectedProvider]}</strong> to complete your payment securely.
                </p>

                {/* Order summary */}
                <div className="bg-muted/50 border border-border rounded p-4 text-left space-y-3 mb-8">
                  <div className="flex items-center gap-3">
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.name} className="w-14 h-16 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      {orderId && <p className="text-xs text-muted-foreground">Order #{orderId}</p>}
                    </div>
                    <span className="font-medium whitespace-nowrap">
                      ${totalAmount > 0 ? totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {shippingAddress && (
                    <div className="border-t border-border pt-3 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground text-xs mb-1">Delivery Address</p>
                      <p>{shippingAddress}</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-6">
                  By clicking "Proceed to Pay" you will be taken to {providerLabels[selectedProvider]}'s secure payment page.
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-none" onClick={() => setState('selection')}>
                    Change Method
                  </Button>
                  <Button className="flex-1 rounded-none gap-2" onClick={handleProceedToPay}>
                    Proceed to Pay
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Success State */}
            {state === 'success' && (
              <div className="p-8 text-center">
                <motion.div
                  className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                >
                  <Check className="w-10 h-10 text-green-600" />
                </motion.div>
                <h2 className="font-serif text-3xl mb-2">Order Confirmed</h2>
                <p className="text-muted-foreground mb-1">Your order has been placed successfully.</p>
                {orderId && (
                  <p className="text-sm text-muted-foreground mb-6">Order #{orderId}</p>
                )}
                <p className="text-sm text-muted-foreground mb-8 bg-muted p-3 rounded">
                  Payment will be collected on delivery. Our team will contact you with shipping details.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-none" onClick={resetAndClose}>
                    Continue Shopping
                  </Button>
                  <Button className="flex-1 rounded-none" onClick={() => { resetAndClose(); setLocation('/account'); }}>
                    View Orders
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {state === 'error' && (
              <div className="p-8 text-center">
                <motion.div
                  className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                >
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </motion.div>
                <h2 className="font-serif text-2xl mb-2">Something went wrong</h2>
                <p className="text-muted-foreground mb-8 text-sm">{errorMessage}</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-none" onClick={resetAndClose}>
                    Cancel
                  </Button>
                  <Button className="flex-1 rounded-none" onClick={() => setState('selection')}>
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Selection State */}
            {(state === 'selection' || state === 'address') && (
              <>
                {/* Header */}
            <div className="p-6 border-b border-border flex flex-col sm:flex-row gap-4">
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full sm:w-16 h-20 object-cover rounded flex-shrink-0"
                />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Complete Your Purchase</p>
                    <h2 className="font-serif text-xl leading-tight truncate">{product.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-lg font-medium">
                        ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ${product.compareAtPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address form (shown after provider selected) */}
                {state === 'address' && (
                  <div className="p-6 border-b border-border space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Delivery Address <span className="text-muted-foreground">(optional)</span></Label>
                      <Textarea
                        value={shippingAddress}
                        onChange={e => setShippingAddress(e.target.value)}
                        placeholder="Enter your delivery address..."
                        className="rounded-none resize-none h-20 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Order Notes <span className="text-muted-foreground">(optional)</span></Label>
                      <Textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Any special requests or notes..."
                        className="rounded-none resize-none h-16 text-sm"
                      />
                    </div>
            <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1 rounded-none text-sm"
                    onClick={() => setState('selection')}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 rounded-none gap-2 text-sm"
                    onClick={handleConfirm}
                  >
                    Confirm Order
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                  </div>
                )}

                {/* Payment options (shown in selection state) */}
                {state === 'selection' && (
                  <div className="p-6 space-y-3">
                    <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">How would you like to pay?</p>

                    {/* Pay on Delivery */}
                    <button
                      data-testid="button-pay-on-delivery"
                      onClick={() => handleProviderSelect('cod')}
                      className="w-full flex items-center gap-4 p-4 border border-border hover:border-primary hover:bg-muted/40 transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Truck className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="font-medium">Pay on Delivery</p>
                        <p className="text-xs text-muted-foreground">Cash or card when your order arrives</p>
                      </div>
                      <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>

                    {/* Pay with Paystack */}
                    <button
                      data-testid="button-pay-paystack"
                      onClick={() => handleProviderSelect('paystack')}
                      className="w-full flex items-center gap-4 p-4 border border-border hover:border-[#00c3f7] hover:bg-[#00c3f7]/5 transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 transition-colors">
                        <span className="text-sm font-bold text-[#00c3f7]">PS</span>
                      </div>
                      <div>
                        <p className="font-medium">Pay with Paystack</p>
                        <p className="text-xs text-muted-foreground">Cards, bank transfer, USSD &amp; more</p>
                      </div>
                      <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </button>

                    {/* Pay with Stripe */}
                    <button
                      data-testid="button-pay-stripe"
                      onClick={() => handleProviderSelect('stripe')}
                      className="w-full flex items-center gap-4 p-4 border border-border hover:border-[#635bff] hover:bg-[#635bff]/5 transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-[#635bff]" />
                      </div>
                      <div>
                        <p className="font-medium">Pay with Stripe</p>
                        <p className="text-xs text-muted-foreground">All major credit &amp; debit cards</p>
                      </div>
                      <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </button>

                    <p className="text-center text-xs text-muted-foreground pt-2">
                      Secured by industry-standard encryption. Your payment details are never stored.
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
