import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ShieldCheck, ChevronRight, RefreshCw, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LegalDoc {
  slug: string;
  title: string;
  content: string;
  updatedAt?: string;
}

export default function TermsPage() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/legal/terms');
      if (res.ok) {
        const data = await res.json();
        setDoc(data);
      }
    } catch (err) {
      console.error('Failed to load terms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Hero Banner */}
      <div className="bg-muted/40 border-b border-border py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs tracking-widest uppercase font-medium mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Legal & Policies
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-foreground font-normal tracking-tight">
            {doc?.title || "Terms & Conditions"}
          </h1>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
            Please review the terms governing our bespoke bridal creations, online orders, appointments, and services.
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 mt-6">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">Terms & Conditions</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 md:px-6 max-w-4xl pt-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading latest terms & conditions...</p>
          </div>
        ) : (
          <div className="bg-card border border-border/80 shadow-sm p-6 sm:p-10 md:p-12 space-y-8">
            {doc?.updatedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border pb-4">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Last updated: {new Date(doc.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            )}

            <div className="prose prose-neutral max-w-none space-y-6 text-foreground/90 font-light leading-relaxed">
              {doc?.content.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="font-serif text-xl sm:text-2xl text-foreground pt-4 pb-1 border-b border-border/50 font-normal">
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                }
                if (paragraph.startsWith('* ')) {
                  const bulletLines = paragraph.split('\n');
                  return (
                    <ul key={index} className="list-disc list-outside pl-5 space-y-2 text-sm sm:text-base">
                      {bulletLines.map((line, bIdx) => {
                        const cleanLine = line.replace(/^\*\s*/, '');
                        // Parse bold prefix like **Title:**
                        const match = cleanLine.match(/^\*\*(.*?)\*\*(.*)/);
                        if (match) {
                          return (
                            <li key={bIdx}>
                              <strong className="font-medium text-foreground">{match[1]}</strong>
                              {match[2]}
                            </li>
                          );
                        }
                        return <li key={bIdx}>{cleanLine}</li>;
                      })}
                    </ul>
                  );
                }
                return (
                  <p key={index} className="text-sm sm:text-base text-foreground/85 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            <div className="border-t border-border pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Have specific questions regarding bespoke bridal fittings?</span>
              </div>
              <div className="flex gap-3">
                <Link href="/privacy">
                  <Button variant="outline" size="sm">Privacy Policy</Button>
                </Link>
                <Link href="/contact">
                  <Button size="sm">Contact Concierge</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
