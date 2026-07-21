import React from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForgotPassword } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation(); 
  const { toast } = useToast();
  const forgotMutation = useForgotPassword();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    forgotMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Check your email", description: "If an account exists, a reset code has been sent." });
        setLocation("/login");
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Something went wrong", 
          description: err?.data?.message || "Please try again later." 
        });
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <h2 className="mt-6 text-center font-serif text-3xl sm:text-4xl text-foreground">Forgot Password</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your email and we'll send you a 6-digit reset code.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-5 sm:px-10 shadow-sm sm:rounded-lg border border-border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <div>
                <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
                  {forgotMutation.isPending ? "Sending code..." : "Send reset code"}
                </Button>
              </div>
            </form>
          </Form>

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