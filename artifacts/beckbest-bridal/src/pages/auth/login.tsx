import React from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLoginCustomer } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setCustomerToken } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLoginCustomer();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setCustomerToken(res.token);
        toast({ title: "Welcome back", description: "You have successfully logged in." });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Login failed", 
          description: err?.data?.message || "Invalid credentials. Please try again." 
        });
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <h2 className="mt-6 text-center font-serif text-3xl sm:text-4xl text-foreground">Welcome Back</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to access your account and saved items
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-6 flex flex-col sm:flex-row sm:justify-between text-center text-sm gap-2">
            <div>
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register" className="font-medium text-primary hover:text-primary/80">
                Register here
              </Link>
            </div>
            <div>
              <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/80">
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
