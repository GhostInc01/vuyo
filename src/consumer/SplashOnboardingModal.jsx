import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, ArrowRight, ArrowLeft, Sparkles, Store, ShoppingBag, ShieldCheck, Heart } from 'lucide-react';

export default function SplashOnboardingModal({ isOpen, onClose }) {
  const { setPortal, setConsumerTab, setIsAuthOpen, isOnboardingOpen, setIsOnboardingOpen } = useApp();
  const [step, setStep] = useState(0);

  const isVisible = isOpen !== undefined ? isOpen : isOnboardingOpen;
  const handleClose = () => {
    localStorage.setItem('localbiz_onboarded', 'true');
    if (onClose) onClose();
    else setIsOnboardingOpen(false);
  };

  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (!isVisible) return null;

  const slides = [
    {
      title: 'Welcome to LocalBiz SA',
      subtitle: 'Your whole neighbourhood, one vibrant marketplace',
      desc: 'Connecting thousands of passionate township entrepreneurs, home businesses, and certified tradespeople directly with local buyers.',
      icon: Store,
      badge: 'Local Pride',
      bgGrad: 'from-amber-400/20 to-accent/30'
    },
    {
      title: 'Shop Products & Book Services',
      subtitle: 'Fresh bread, Avon beauty, and trusted plumbers',
      desc: 'Order doorstep delivery from local bakeries and beauty agents, or schedule verified trade professionals with clear call-out rates.',
      icon: ShoppingBag,
      badge: 'Fast & Reliable',
      bgGrad: 'from-emerald-400/20 to-success/30'
    },
    {
      title: 'Direct WhatsApp Community',
      subtitle: 'Real humans, real neighbourly connections',
      desc: 'Chat directly with business owners, request custom orders, track real-time delivery progress, and pay safely via Card or Cash on Handover.',
      icon: Heart,
      badge: 'Secure Commerce',
      bgGrad: 'from-amber-500/20 to-accent-deep/30'
    }
  ];

  const current = slides[step];
  const Icon = current.icon;

  const handleComplete = () => {
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-md w-full overflow-hidden animate-in zoom-in-95 flex flex-col"
      >
        {/* Header Strip */}
        <div className="p-4 flex items-center justify-between border-b border-ink/10 bg-paper-warm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <span id="onboarding-title" className="text-xs font-bold text-ink uppercase tracking-wider">
              Neighbourhood Onboarding ({step + 1}/{slides.length})
            </span>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            aria-label="Skip onboarding walkthrough"
            className="text-xs font-bold text-ink-muted hover:text-ink px-2 py-1 rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Hero Visual */}
        <div className={`p-8 bg-gradient-to-br ${current.bgGrad} flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-300`}>
          <div className="w-20 h-20 rounded-3xl bg-paper border-2 border-ink shadow-raised flex items-center justify-center text-accent-deep mb-4">
            <Icon size={36} />
          </div>

          <span className="bg-ink text-paper text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm mb-2">
            {current.badge}
          </span>

          <h3 className="font-display font-extrabold text-2xl text-ink leading-tight">
            {current.title}
          </h3>

          <p className="text-xs font-bold text-ink-soft mt-1">
            {current.subtitle}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
          <p className="text-xs text-ink/80 leading-relaxed text-center">
            {current.desc}
          </p>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  step === i ? 'w-8 bg-accent-deep' : 'w-2 bg-ink/15'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="p-3 rounded-2xl bg-paper-warm hover:bg-paper border border-ink/15 text-ink transition-colors flex items-center justify-center"
                aria-label="Previous step"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            {step < slides.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex-1 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 py-3 rounded-2xl bg-ink hover:bg-ink/90 text-paper font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2"
              >
                <Sparkles size={15} className="text-accent" />
                <span>Start Exploring Marketplace</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
