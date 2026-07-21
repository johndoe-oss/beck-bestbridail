import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function AppEmptyState({ 
  title, 
  description, 
  icon: Icon,
  actionLabel,
  actionHref,
  onAction
}: { 
  title: string;
  description: string;
  icon?: React.ElementType;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center min-h-[400px]">
      <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
        {Icon ? (
          <Icon className="h-10 w-10 text-primary/40" strokeWidth={1} />
        ) : (
          <div className="h-10 w-10 border border-primary/20 rounded-full flex items-center justify-center">
            <span className="h-4 w-4 bg-primary/20 rounded-full" />
          </div>
        )}
      </div>
      <h3 className="font-serif text-2xl mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-8">{description}</p>
      
      {actionHref ? (
        <Button asChild className="rounded-full px-8">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : onAction && actionLabel ? (
        <Button onClick={onAction} className="rounded-full px-8">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
