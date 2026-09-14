import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function Rating({
  value = 0,
  count = null,
  interactive = false,
  onChange = () => {},
  size = 15,
  showValue = true,
  showCount = true,
  className = ''
}) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = interactive && hoverValue > 0 ? hoverValue : Number(value || 0);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue;
          const isHalf = !isFilled && star - 0.5 <= displayValue;

          return (
            <button
              key={star}
              type={interactive ? 'button' : undefined}
              disabled={!interactive}
              onClick={() => interactive && onChange(star)}
              onMouseEnter={() => interactive && setHoverValue(star)}
              onMouseLeave={() => interactive && setHoverValue(0)}
              className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} focus:outline-none`}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                size={size}
                className={`${
                  isFilled
                    ? 'fill-accent text-accent-deep'
                    : isHalf
                    ? 'fill-accent/50 text-accent-deep'
                    : 'fill-transparent text-ink/25'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className="text-xs font-extrabold text-ink leading-none">
          {Number(value || 0).toFixed(1)}
        </span>
      )}

      {showCount && count !== null && count !== undefined && (
        <span className="text-[11px] font-medium text-ink-muted leading-none">
          ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
}
