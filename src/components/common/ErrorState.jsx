import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Unable to load content',
  message = 'A network or server error occurred while retrieving local data. Please check your connection and try again.',
  onRetry = null,
  retryText = 'Retry Request',
  compact = false,
  className = ''
}) {
  if (compact) {
    return (
      <div role="alert" className={`p-3 bg-warning-tint border border-warning/30 rounded-2xl text-xs text-ink flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning shrink-0" />
          <span className="font-semibold">{message}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-sm bg-warning hover:bg-warning/90 text-white shadow-sm"
          >
            <RefreshCw size={11} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div role="alert" className={`p-8 md:p-10 rounded-3xl bg-warning-tint/30 border border-warning/25 text-center flex flex-col items-center justify-center max-w-md mx-auto ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-warning/15 text-warning flex items-center justify-center mb-4">
        <AlertTriangle size={28} />
      </div>

      <h3 className="font-display font-extrabold text-base text-ink mb-1.5">{title}</h3>
      <p className="text-xs text-ink-muted leading-relaxed max-w-sm mb-6">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary"
        >
          <RefreshCw size={14} />
          <span>{retryText}</span>
        </button>
      )}
    </div>
  );
}
