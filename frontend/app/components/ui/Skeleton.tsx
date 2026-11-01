'use client';

import React from 'react';

export function CardSkeleton() {
  return (
    <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 flex flex-col justify-between space-y-5 animate-shimmer relative overflow-hidden">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 rounded-full bg-white/10" />
          <div className="h-4 w-16 rounded-full bg-white/10" />
        </div>
        <div className="h-6 w-3/4 rounded-xl bg-white/15" />
        <div className="h-3 w-1/2 rounded-lg bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5">
        <div className="space-y-1.5">
          <div className="h-2.5 w-12 rounded bg-white/10" />
          <div className="h-5 w-20 rounded bg-white/15" />
        </div>
        <div className="space-y-1.5 text-right flex flex-col items-end">
          <div className="h-2.5 w-14 rounded bg-white/10" />
          <div className="h-5 w-24 rounded bg-white/15" />
        </div>
      </div>

      <div className="h-10 w-full rounded-2xl bg-white/10" />
    </div>
  );
}

export function CreatorSkeleton() {
  return (
    <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 flex flex-col justify-between space-y-4 animate-shimmer relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-full bg-white/10" />
        <div className="h-4 w-14 rounded-full bg-white/10" />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/15 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 rounded-lg bg-white/15" />
          <div className="h-3 w-1/2 rounded bg-white/10" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5">
        <div className="h-8 rounded bg-white/10" />
        <div className="h-8 rounded bg-white/10" />
        <div className="h-8 rounded bg-white/10" />
      </div>

      <div className="h-8 w-full rounded-xl bg-white/10" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 animate-shimmer relative overflow-hidden">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-6 h-6 rounded-full bg-white/10" />
        <div className="w-8 h-8 rounded-xl bg-white/15" />
        <div className="space-y-1.5 flex-1 max-w-xs">
          <div className="h-4 w-32 rounded bg-white/15" />
          <div className="h-2.5 w-20 rounded bg-white/10" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-6 w-16 rounded bg-white/15" />
        <div className="h-7 w-20 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 animate-shimmer relative overflow-hidden">
      <div className="h-3 w-20 rounded bg-white/10" />
      <div className="h-7 w-32 rounded-lg bg-white/15" />
      <div className="h-2.5 w-24 rounded bg-white/5" />
    </div>
  );
}

