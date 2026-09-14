import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({
  type = 'cards', // 'cards' | 'list' | 'spinner' | 'profile' | 'table'
  count = 4,
  message = 'Loading local businesses & products...',
  className = ''
}) {
  if (type === 'spinner') {
    return (
      <div 
        role="status" 
        aria-live="polite" 
        aria-busy="true"
        className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
      >
        <Loader2 size={36} className="animate-spin text-accent-deep mb-3" />
        <p className="text-xs font-bold text-ink-muted animate-pulse">{message}</p>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className={`table-container ${className}`}>
        <div className="p-4 bg-paper-warm border-b border-ink/10 animate-pulse flex items-center justify-between">
          <div className="h-4 bg-ink/10 rounded w-1/4" />
          <div className="h-4 bg-ink/10 rounded w-16" />
        </div>
        <div className="divide-y divide-ink/5">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-xl bg-paper-warm shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-paper-warm rounded w-1/3" />
                  <div className="h-2.5 bg-paper-warm rounded w-1/2" />
                </div>
              </div>
              <div className="h-3.5 bg-paper-warm rounded w-16 shrink-0" />
              <div className="h-3.5 bg-paper-warm rounded w-20 shrink-0 hidden sm:block" />
              <div className="h-7 bg-paper-warm rounded-lg w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-paper border border-ink/10 shadow-sm flex items-center gap-4 animate-pulse"
          >
            <div className="w-12 h-12 rounded-xl bg-paper-warm shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-paper-warm rounded-md w-1/3" />
              <div className="h-3 bg-paper-warm rounded-md w-2/3" />
            </div>
            <div className="w-16 h-8 bg-paper-warm rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className={`space-y-6 animate-pulse ${className}`}>
        <div className="h-64 rounded-3xl bg-paper-warm border border-ink/10" />
        <div className="p-6 rounded-3xl bg-paper border border-ink/10 space-y-4">
          <div className="h-8 bg-paper-warm rounded-md w-1/2" />
          <div className="h-4 bg-paper-warm rounded-md w-3/4" />
          <div className="h-4 bg-paper-warm rounded-md w-1/3" />
        </div>
      </div>
    );
  }

  // Default: cards grid skeleton
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-3xl bg-paper border border-ink/10 overflow-hidden shadow-sm flex flex-col animate-pulse"
        >
          <div className="h-44 bg-paper-warm w-full relative" />
          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-paper-warm rounded-md w-3/4" />
              <div className="h-3 bg-paper-warm rounded-md w-full" />
              <div className="h-3 bg-paper-warm rounded-md w-2/3" />
            </div>
            <div className="pt-3 border-t border-ink/10 flex items-center justify-between">
              <div className="h-4 bg-paper-warm rounded-md w-16" />
              <div className="h-4 bg-paper-warm rounded-md w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
