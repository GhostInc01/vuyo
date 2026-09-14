import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { X, Lock, Mail, User, Phone, ShieldCheck, Store, ShoppingBag, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, login, registerUser, switchDemoRole, categories, addToast } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [role, setRole] = useState('consumer'); // 'consumer' | 'business'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Beauty & Cosmetics');
  const [businessDescription, setBusinessDescription] = useState('');
  const [address, setAddress] = useState('Alberton North');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isAuthOpen) {
        setIsAuthOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthOpen, setIsAuthOpen]);

  if (!isAuthOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await registerUser({
          name,
          email,
          password,
          role,
          phone,
          ...(role === 'business' ? {
            businessName,
            businessCategory,
            businessDescription,
            address,
            suburb: address,
            category: businessCategory,
            description: businessDescription
          } : {})
        });
      } else if (mode === 'forgot-password') {
        const res = await api.forgotPassword(email);
        setResetSuccess(true);
        setResetMessage(res.message || 'If an account exists with this email, password reset instructions have been sent.');
      }
    } catch (err) {
      setAuthError(err.message || 'Action failed');
      if (addToast) addToast(err.message || 'Action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-md w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm shrink-0">
          <div>
            <h2 id="auth-modal-title" className="font-display font-extrabold text-xl text-ink">
              {mode === 'login' ? 'Sign In to LocalBiz' : mode === 'register' ? 'Create an Account' : 'Reset Password'}
            </h2>
            <p className="text-[11px] text-ink-muted">
              {mode === 'login' 
                ? 'Access your local orders, bookings & chats' 
                : mode === 'register'
                ? 'Join 35,000+ local buyers & neighborhood businesses'
                : 'Recover access to your LocalBiz account'}
            </p>
          </div>
          <button
            onClick={() => setIsAuthOpen(false)}
            aria-label="Close Authentication Modal"
            className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {authError && (
          <div role="alert" className="mx-5 mt-4 p-3 bg-danger-tint border border-danger/30 rounded-xl text-xs text-danger font-semibold flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Mode Switcher */}
        {mode === 'forgot-password' ? (
          <div className="flex items-center px-5 py-2.5 bg-paper-warm/50 border-b border-ink/10">
            <button
              type="button"
              onClick={() => { setResetSuccess(false); setMode('login'); }}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent-deep hover:text-ink transition-colors"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </div>
        ) : (
          <div className="flex border-b border-ink/10 bg-paper-warm/50">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${mode === 'login' ? 'bg-paper text-ink border-b-2 border-accent' : 'text-ink-muted hover:text-ink'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${mode === 'register' ? 'bg-paper text-ink border-b-2 border-accent' : 'text-ink-muted hover:text-ink'}`}
            >
              Register
            </button>
          </div>
        )}

        {/* Quick Demo Role Switcher */}
        <div className="p-4 bg-accent/10 border-b border-ink/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent-deep mb-2">
            ⚡ Quick Test / Demo Accounts (1-Click)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { switchDemoRole('consumer'); setIsAuthOpen(false); }}
              className="px-2 py-1.5 rounded-lg bg-paper border border-ink/15 hover:border-accent text-center text-[10px] font-bold text-ink transition-colors shadow-sm"
            >
              👤 Consumer
            </button>
            <button
              type="button"
              onClick={() => { switchDemoRole('business'); setIsAuthOpen(false); }}
              className="px-2 py-1.5 rounded-lg bg-paper border border-ink/15 hover:border-accent text-center text-[10px] font-bold text-ink transition-colors shadow-sm"
            >
              🏪 Merchant
            </button>
            <button
              type="button"
              onClick={() => { switchDemoRole('admin'); setIsAuthOpen(false); }}
              className="px-2 py-1.5 rounded-lg bg-paper border border-ink/15 hover:border-accent text-center text-[10px] font-bold text-ink transition-colors shadow-sm"
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {mode === 'register' && (
            <>
              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">I am registering as:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('consumer')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${role === 'consumer' ? 'border-accent bg-accent/20 font-bold' : 'border-ink/15 hover:bg-paper-warm'}`}
                  >
                    <ShoppingBag size={16} className="text-accent-deep" />
                    <span className="text-xs text-ink font-semibold">Shopper / Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('business')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${role === 'business' ? 'border-accent bg-accent/20 font-bold' : 'border-ink/15 hover:bg-paper-warm'}`}
                  >
                    <Store size={16} className="text-accent-deep" />
                    <span className="text-xs text-ink font-semibold">Local Business</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                  {role === 'business' ? 'Owner / Primary Contact Name' : 'Full Name'}
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lerato Sithole"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {role === 'business' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">Business Name</label>
                    <div className="relative">
                      <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sithole Tailoring & Fashion"
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-soft mb-1">Category</label>
                      <select
                        value={businessCategory}
                        onChange={e => setBusinessCategory(e.target.value)}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      >
                        {categories && categories.length > 0 ? (
                          categories.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)
                        ) : (
                          <>
                            <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                            <option value="Food & Fresh Produce">Food & Fresh Produce</option>
                            <option value="Home & Garden Services">Home & Garden Services</option>
                            <option value="Automotive Care">Automotive Care</option>
                            <option value="Health & Wellness">Health & Wellness</option>
                            <option value="Professional Services">Professional Services</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ink-soft mb-1">Suburb / Address</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alberton North"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">Business Description</label>
                    <textarea
                      rows={2}
                      placeholder="Brief overview of what products or services you provide..."
                      value={businessDescription}
                      onChange={e => setBusinessDescription(e.target.value)}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent resize-none"
                    />
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-ink leading-relaxed">
                    <span className="font-bold text-amber-800">🛡️ Admin Approval Required:</span> Newly registered businesses are placed in <strong className="text-amber-800">PENDING</strong> status until verified by compliance before appearing in the public marketplace.
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1">Phone Number</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="tel"
                    required
                    placeholder="+27 82 000 0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </>
          )}

          {mode === 'forgot-password' ? (
            resetSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={26} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Instructions Sent</h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    {resetMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setResetSuccess(false); setMode('login'); }}
                  className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-sm"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Enter your registered LocalBiz account email and we'll send you recovery instructions.
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="email"
                      required
                      placeholder="you@domain.co.za"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Mail size={16} />
                  <span>{isSubmitting ? 'Sending Request...' : 'Send Password Reset Link'}</span>
                </button>
              </>
            )
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.co.za"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-ink-soft">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setResetSuccess(false); setMode('forgot-password'); }}
                      className="text-[11px] text-accent-deep hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                <span>{isSubmitting ? 'Authenticating...' : mode === 'login' ? 'Sign In to Account' : 'Complete Registration'}</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

