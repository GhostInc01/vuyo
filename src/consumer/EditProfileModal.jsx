import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, User, Phone, MapPin, Image, Check, ShieldCheck } from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
];

export default function EditProfileModal() {
  const { user, savedProfile, isEditProfileOpen, setIsEditProfileOpen, updateUserProfile } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_PRESETS[0]);
  const [address, setAddress] = useState(savedProfile?.address || '14 Voortrekker Ave, Alberton North');
  const [notes, setNotes] = useState(savedProfile?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditProfileOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsEditProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditProfileOpen, setIsEditProfileOpen]);

  if (!isEditProfileOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateUserProfile({
        name,
        phone,
        avatar,
        address,
        notes
      });
      setIsEditProfileOpen(false);
    } catch (err) {
      // toast shown by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-md w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm shrink-0">
          <div>
            <h2 id="edit-profile-title" className="font-display font-extrabold text-lg text-ink">Edit Profile</h2>
            <p className="text-[11px] text-ink-muted">Update your contact information and delivery preferences</p>
          </div>
          <button
            onClick={() => setIsEditProfileOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
            aria-label="Close profile editor"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Avatar Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-2">Profile Avatar</label>
            <div className="flex items-center gap-3">
              <img
                src={avatar}
                alt="Selected Avatar"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-accent shrink-0 shadow-sm"
              />
              <div className="flex gap-2 flex-wrap">
                {AVATAR_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(p)}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                      avatar === p ? 'border-accent ring-2 ring-accent/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={p} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="label-base">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                className="input-base pl-9"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="label-base">Contact Phone</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 000 0000"
                className="input-base pl-9"
              />
            </div>
          </div>

          {/* Preferred Delivery Address */}
          <div>
            <label className="label-base">Default Delivery Address</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 14 Voortrekker Ave, Alberton North"
                className="input-base pl-9"
              />
            </div>
          </div>

          {/* Delivery Notes */}
          <div>
            <label className="label-base">Delivery Instructions / Gate Code</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Buzz unit 4B at intercom, leave with security if not home"
              className="textarea-base"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-base btn-primary btn-md w-full justify-center shadow-raised"
          >
            <ShieldCheck size={16} />
            <span>{isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
