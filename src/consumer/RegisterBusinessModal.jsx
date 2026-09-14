import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Store, User, Phone, MapPin, Tag, FileText, CheckCircle2, ShieldCheck, Upload } from 'lucide-react';
import { api } from '../services/api';

export default function RegisterBusinessModal() {
  const { 
    isRegisterBusinessOpen, 
    setIsRegisterBusinessOpen, 
    addToast, 
    refreshData,
    suburb: defaultSuburb,
    categories 
  } = useApp();

  const [businessName, setBusinessName] = useState('');
  const [owner, setOwner] = useState('');
  const [phone, setPhone] = useState('+27 ');
  const [category, setCategory] = useState('Beauty & Cosmetics');
  const [kind, setKind] = useState('retail'); // 'retail' | 'service' | 'brand-agent'
  const [suburb, setSuburb] = useState(defaultSuburb || 'Alberton North');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [documents, setDocuments] = useState(['SA ID Copy (Uploaded)', 'Proof of Residence (Uploaded)']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isRegisterBusinessOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsRegisterBusinessOpen(false);
        setIsDone(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRegisterBusinessOpen, setIsRegisterBusinessOpen]);

  if (!isRegisterBusinessOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createMerchant({
        name: businessName,
        owner,
        phone,
        category,
        kind,
        suburb,
        tagline,
        about,
        documents
      });
      setIsDone(true);
      addToast('Application submitted for Administrator Approval!', 'success');
      refreshData();
    } catch (err) {
      addToast('Failed to submit application: ' + err.message, 'error');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-business-title"
        className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-xl w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-ink font-bold shadow-sm">
              <Store size={20} />
            </div>
            <div>
              <h2 id="register-business-title" className="font-display font-extrabold text-lg text-ink">Register Your Local Business</h2>
              <p className="text-[11px] text-ink-muted">Join the South African Hyperlocal Marketplace</p>
            </div>
          </div>
          <button
            onClick={() => { setIsRegisterBusinessOpen(false); setIsDone(false); }}
            className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
            aria-label="Close registration modal"
          >
            <X size={18} />
          </button>
        </div>

        {isDone ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success-tint border border-success/30 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="font-display font-extrabold text-2xl text-ink">Application Received!</h3>
            <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
              Your business profile for <strong>{businessName}</strong> has been submitted. Our compliance team will review your trade docs within 24 business hours. You can track this in the Super Admin console.
            </p>
            <button
              onClick={() => { setIsRegisterBusinessOpen(false); setIsDone(false); }}
              className="btn-base btn-primary btn-md mx-auto"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {/* Step 1: Core Business Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-base">Trading Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sindi's Fresh Bakery"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="input-base"
                />
              </div>

              <div>
                <label className="label-base">Owner / Representative Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sindisiwe Dlamini"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  className="input-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label-base">WhatsApp / Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="+27 82 000 0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input-base"
                />
              </div>

              <div>
                <label className="label-base">Business Type</label>
                <select
                  value={kind}
                  onChange={e => setKind(e.target.value)}
                  className="select-base"
                >
                  <option value="retail">Local Goods & Retail</option>
                  <option value="service">Trades & Services</option>
                  <option value="brand-agent">Direct Brand Agent (Avon/Blossom)</option>
                </select>
              </div>

              <div>
                <label className="label-base">Primary Suburb</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alberton North"
                  value={suburb}
                  onChange={e => setSuburb(e.target.value)}
                  className="input-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-base">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="select-base"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-base">Tagline / Catchphrase</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warm artisanal loaves baked fresh every dawn"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="input-base"
                />
              </div>
            </div>

            <div>
              <label className="label-base">About Your Business</label>
              <textarea
                rows="2"
                placeholder="Share your story, experience, certifications and neighborhood coverage..."
                value={about}
                onChange={e => setAbout(e.target.value)}
                className="textarea-base"
              />
            </div>

            {/* KYC Compliance Upload Notice */}
            <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-ink">
                <ShieldCheck size={16} className="text-success" />
                <span>KYC Verification Documents</span>
              </div>
              <p className="text-[11px] text-ink-muted">
                To guarantee buyer trust and unlock direct online payments, we pre-verify your SA ID, proof of address, and applicable trade licenses.
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-paper border border-ink/10 text-[10px] font-semibold text-ink flex items-center gap-1">
                  <FileText size={11} className="text-accent-deep" />
                  <span>ID & Residence Attached</span>
                </span>
                <span className="text-[10px] text-success font-bold">✓ Ready for Admin Review</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-base btn-primary btn-md w-full justify-center shadow-raised"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Submitting to LocalBiz...' : 'Submit Application for Review'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

