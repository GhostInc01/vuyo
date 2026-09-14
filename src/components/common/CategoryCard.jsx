import React from 'react';
import { 
  Tag, Heart, Croissant, Wrench, Zap, Carrot, Sparkles, 
  ShoppingBag, Store, ShieldCheck, Car, Coffee, Cpu, Scissors, Shirt
} from 'lucide-react';

const ICON_MAP = {
  'Heart': Heart,
  'Croissant': Croissant,
  'Wrench': Wrench,
  'Zap': Zap,
  'Carrot': Carrot,
  'Sparkles': Sparkles,
  'ShoppingBag': ShoppingBag,
  'Store': Store,
  'ShieldCheck': ShieldCheck,
  'Car': Car,
  'Coffee': Coffee,
  'Cpu': Cpu,
  'Scissors': Scissors,
  'Shirt': Shirt,
  'Tag': Tag
};

export default function CategoryCard({
  category,
  onSelect = () => {},
  isSelected = false,
  count = null,
  compact = false,
  className = ''
}) {
  if (!category) return null;

  const categoryName = category.name || category.label || category;
  const iconKey = category.icon || 'Tag';
  const IconComponent = ICON_MAP[iconKey] || Tag;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onSelect(categoryName)}
        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
          isSelected
            ? 'bg-accent border-ink text-ink shadow-sm scale-105'
            : 'bg-paper hover:bg-paper-warm border-ink/15 text-ink hover:border-accent'
        } ${className}`}
      >
        <IconComponent size={14} className={isSelected ? 'text-ink' : 'text-accent-deep'} />
        <span>{categoryName}</span>
        {count !== null && (
          <span className="text-[10px] bg-paper-warm px-1.5 py-0.2 rounded-full text-ink-muted">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      onClick={() => onSelect(categoryName)}
      className={`group cursor-pointer rounded-3xl p-5 border transition-all flex flex-col justify-between ${
        isSelected
          ? 'bg-accent/20 border-accent shadow-raised'
          : 'bg-paper hover:bg-paper-warm border-ink/15 hover:border-accent hover:shadow-card'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-accent/20 group-hover:bg-accent border border-ink/10 flex items-center justify-center text-accent-deep group-hover:text-ink transition-colors shadow-sm">
          <IconComponent size={22} />
        </div>

        {count !== null && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-paper-warm text-ink-soft border border-ink/10">
            {count} {count === 1 ? 'business' : 'businesses'}
          </span>
        )}
      </div>

      <div>
        <h4 className="font-display font-extrabold text-base text-ink group-hover:text-accent-deep transition-colors mb-1">
          {categoryName}
        </h4>
        {category.desc && (
          <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
            {category.desc}
          </p>
        )}
      </div>
    </div>
  );
}
