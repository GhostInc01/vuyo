import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Store, ShoppingBag, Wrench, Layers, Star, ArrowUpRight } from 'lucide-react';
import { api } from '../../services/api';

export default function SearchBar({
  value = '',
  onChange = () => {},
  onSubmit = null,
  onSelectSuggestion = null,
  placeholder = 'Search local businesses, products, services...',
  category = 'All',
  onCategoryChange = null,
  categories = [],
  className = '',
  size = 'md',
  autoFocus = false,
  enableSuggestions = true
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Fetch search suggestions with 250ms debounce
  useEffect(() => {
    if (!enableSuggestions || !value || value.trim().length < 2) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);
        const results = await api.getSearchSuggestions(value.trim(), 6);
        setSuggestions(results || []);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, enableSuggestions]);

  // Click outside to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSuggestionClick(suggestions[selectedIndex]);
      return;
    }
    setIsFocused(false);
    if (onSubmit) onSubmit(value);
  };

  const handleKeyDown = (e) => {
    if (!isFocused || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setSelectedIndex(-1);
    }
  };

  const handleSuggestionClick = (item) => {
    onChange(item.text);
    setIsFocused(false);
    setSuggestions([]);
    if (onSelectSuggestion) {
      onSelectSuggestion(item);
    } else if (onSubmit) {
      onSubmit(item.text);
    }
  };

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';
  const showDropdown = isFocused && suggestions.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center bg-paper rounded-2xl border transition-all ${
          isFocused ? 'border-accent shadow-raised ring-2 ring-accent/30' : 'border-ink/15 hover:border-ink/30'
        }`}
      >
        {/* Search Icon */}
        <div className={`flex items-center justify-center text-ink-muted pl-4 ${isSmall ? 'pl-3' : isLarge ? 'pl-5' : 'pl-4'}`}>
          <Search size={isSmall ? 15 : isLarge ? 20 : 17} className={isFocused ? 'text-accent-deep' : ''} />
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-muted font-medium focus:outline-none ${
            isSmall ? 'py-2 px-2.5 text-xs' : isLarge ? 'py-2.5 sm:py-4 px-2.5 sm:px-3 text-xs sm:text-base' : 'py-2.5 sm:py-3 px-2.5 sm:px-3 text-xs sm:text-sm'
          }`}
        />

        {/* Clear Button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions([]);
            }}
            className="p-1.5 mr-1 text-ink-muted hover:text-ink rounded-lg hover:bg-paper-warm transition-colors shrink-0"
            aria-label="Clear search query"
          >
            <X size={isSmall ? 13 : 16} />
          </button>
        )}

        {/* Category Dropdown (if enabled) */}
        {onCategoryChange && categories.length > 0 && (
          <div className="hidden sm:flex border-l border-ink/10 pl-2 pr-3 py-1 items-center shrink-0">
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-ink focus:outline-none cursor-pointer pr-1"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id || cat.name || cat} value={cat.name || cat.label || cat}>
                  {cat.name || cat.label || cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Submit Button (if onSubmit provided) */}
        {onSubmit && (
          <button
            type="submit"
            className={`bg-accent hover:bg-accent-hover text-ink font-bold rounded-xl transition-colors shrink-0 shadow-sm mr-1.5 sm:mr-2 ${
              isSmall ? 'px-2.5 py-1.5 text-xs' : isLarge ? 'px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm' : 'px-3 py-2 text-xs'
            }`}
          >
            Search
          </button>
        )}
      </form>

      {/* Autocomplete Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-paper rounded-2xl border border-ink/15 shadow-modal z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-ink/10 flex items-center justify-between text-[10px] font-bold text-ink-muted uppercase tracking-wider px-3">
            <span>Suggestions</span>
            <span>Use ↑↓ keys to navigate</span>
          </div>

          <div className="divide-y divide-ink/5 max-h-72 overflow-y-auto">
            {suggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.id || item.text}-${idx}`}
                  onClick={() => handleSuggestionClick(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/15 text-accent-deep' : 'hover:bg-paper-warm text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === 'business' ? 'bg-amber-100 text-amber-800' :
                      item.type === 'product' ? 'bg-emerald-100 text-emerald-800' :
                      item.type === 'service' ? 'bg-purple-100 text-purple-800' :
                      'bg-paper-warm text-ink-muted'
                    }`}>
                      {item.type === 'business' && <Store size={14} />}
                      {item.type === 'product' && <ShoppingBag size={14} />}
                      {item.type === 'service' && <Wrench size={14} />}
                      {item.type === 'category' && <Layers size={14} />}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{item.text}</div>
                      <div className="text-[10px] text-ink-muted flex items-center gap-1.5 truncate">
                        <span className="capitalize">{item.type}</span>
                        {item.category && <span>· {item.category}</span>}
                        {item.suburb && <span>· {item.suburb}</span>}
                        {item.price !== undefined && <span>· R{Number(item.price).toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.rating && (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-accent-deep">
                        <Star size={10} className="fill-accent text-accent-deep" />
                        <span>{Number(item.rating).toFixed(1)}</span>
                      </span>
                    )}
                    <ArrowUpRight size={13} className="text-ink-muted" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
