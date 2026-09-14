import React from 'react';
import { Store, Search, ShoppingBag, Heart, Calendar, ArrowRight } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Store,
  title = 'No items found',
  message = 'Try adjusting your search criteria, category filters, or location radius.',
  actionText = null,
  onAction = null,
  secondaryActionText = null,
  onSecondaryAction = null,
  className = ''
}) {
  return (
    <div 
      role="status"
      className={`p-8 md:p-12 rounded-3xl bg-paper border border-dashed border-ink/20 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-paper-warm border border-ink/10 flex items-center justify-center text-ink-muted mb-4 shadow-sm">
        <Icon size={28} className="text-accent-deep" />
      </div>

      <h3 className="font-display font-extrabold text-lg text-ink mb-1.5">{title}</h3>
      <p className="text-xs text-ink-muted leading-relaxed max-w-sm mb-6">{message}</p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="btn-primary"
            >
              <span>{actionText}</span>
              <ArrowRight size={14} />
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="btn-outline"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
