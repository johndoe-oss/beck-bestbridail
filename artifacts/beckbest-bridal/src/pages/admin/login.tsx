import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdminLogin } from '@workspace/api-client-react';
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

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { setAdminToken } = useAuth();
  const { toast } = useToast();
  const loginMutation = useAdminLogin();

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
        setAdminToken(res.token);
        toast({ title: "Authenticated", description: "Welcome to BB Studio." });
        setLocation("/bb-studio/dashboard");
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Access Denied", 
          description: err?.data?.message || "Invalid credentials." 
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-sm border border-border">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold uppercase tracking-widest text-primary mb-2">BB Studio</h1>
          <p className="text-muted-foreground text-sm">Secure Portal Access</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Email</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@beckbest.com" {...field} />
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

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Authenticating..." : "Login to Studio"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
