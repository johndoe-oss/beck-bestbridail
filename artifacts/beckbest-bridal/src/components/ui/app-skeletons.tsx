import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[3/4] w-full rounded-sm" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/6" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-md" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex gap-6 border-b border-border pb-6">
            <Skeleton className="h-32 w-24 rounded-md" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
              <div className="flex justify-between pt-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="lg:col-span-1">
        <div className="bg-muted/30 p-6 rounded-lg space-y-4">
          <Skeleton className="h-6 w-1/3 mb-6" />
          <div className="flex justify-between"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/4" /></div>
          <div className="flex justify-between"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/4" /></div>
          <Skeleton className="h-px w-full my-4" />
          <div className="flex justify-between mb-6"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-5 w-1/4" /></div>
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
