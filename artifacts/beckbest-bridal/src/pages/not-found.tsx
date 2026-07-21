import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 text-center">
        <div className="mb-8">
          <h1 className="font-serif text-8xl text-primary/30 font-bold">404</h1>
        </div>
        <h2 className="font-serif text-3xl text-foreground mb-4">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you are looking for doesn't exist or has been moved.
          Perhaps our bridal collection will catch your eye instead?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild>
            <Link href="/products">Shop Collection</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
