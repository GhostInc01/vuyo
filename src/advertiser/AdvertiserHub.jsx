import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Megaphone, TrendingUp, Eye, MousePointer, Plus, CheckCircle } from 'lucide-react';

export default function AdvertiserHub() {
  const { campaigns, addToast, refreshData } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [sponsorName, setSponsorName] = useState('');
  const [headline, setHeadline] = useState('');
  const [cta, setCta] = useState('Learn More');
  const [zone, setZone] = useState('Alberton & South');
  const [budget, setBudget] = useState('R5,000/mo');

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsor: sponsorName,
          headline: headline,
          cta: cta,
          zone: zone,
          budget: budget
        })
      });
      if (res.ok) {
        addToast('Campaign submitted for approval!', 'success');
        setIsCreating(false);
        setSponsorName('');
        setHeadline('');
        refreshData();
      }
    } catch (err) {
      addToast('Failed to create campaign', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-paper rounded-3xl border border-ink/15 p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-3xl text-ink">Advertiser & Sponsor Hub</h1>
            <span className="bg-accent text-ink text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">Sponsor Hub</span>
          </div>
          <p className="text-xs text-ink-muted">Place sponsored local promotions across neighbourhood feeds in Gauteng</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>{isCreating ? 'Cancel' : 'Create New Campaign'}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-paper p-5 rounded-2xl border border-ink/15 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Total Impressions</span>
          <div className="font-display font-extrabold text-3xl text-ink">70,100</div>
          <div className="text-[11px] text-success font-bold flex items-center gap-1">
            <Eye size={13} />
            <span>Local residents reached</span>
          </div>
        </div>

        <div className="bg-paper p-5 rounded-2xl border border-ink/15 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Total Clicks</span>
          <div className="font-display font-extrabold text-3xl text-ink">2,920</div>
          <div className="text-[11px] text-ink-muted">Direct to store/catalog</div>
        </div>

        <div className="bg-paper p-5 rounded-2xl border border-ink/15 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Avg. Click-Through</span>
          <div className="font-display font-extrabold text-3xl text-ink">4.18%</div>
          <div className="text-[11px] text-success font-bold">2.5x industry standard</div>
        </div>

        <div className="bg-paper p-5 rounded-2xl border border-ink/15 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Active Ad Spend</span>
          <div className="font-display font-extrabold text-3xl text-ink">R19,300</div>
          <div className="text-[11px] text-ink-muted">Across 2 live campaigns</div>
        </div>
      </div>

      {/* Campaign Creation Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="bg-paper p-6 rounded-3xl border-2 border-accent shadow-raised space-y-4 animate-in fade-in">
          <h2 className="font-display font-extrabold text-xl text-ink">Launch Neighbourhood Campaign</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-base">Brand / Sponsor Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Standard Bank SME / Build It"
                value={sponsorName}
                onChange={e => setSponsorName(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">Target Zone / Suburb</label>
              <select
                value={zone}
                onChange={e => setZone(e.target.value)}
                className="select-base"
              >
                <option>Nationwide (All Feeds)</option>
                <option>Alberton & South</option>
                <option>Johannesburg South</option>
                <option>East Rand Metro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-base">Ad Headline & Hook</label>
            <input
              type="text"
              required
              placeholder="e.g. Zero monthly fees for your first year, free card machine for LocalBiz sellers."
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-base">CTA Button Text</label>
              <input
                type="text"
                required
                value={cta}
                onChange={e => setCta(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">Monthly Budget</label>
              <input
                type="text"
                required
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-base btn-primary btn-md"
          >
            Submit Campaign to LocalBiz
          </button>
        </form>
      )}

      {/* Campaigns Table */}
      <div className="bg-paper rounded-3xl border border-ink/15 overflow-hidden shadow-card">
        <div className="p-5 border-b border-ink/10">
          <h2 className="font-display font-extrabold text-xl text-ink">Active Ad Campaigns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper-warm border-b border-ink/10 text-[11px] font-bold text-ink-muted uppercase">
              <tr>
                <th className="p-4">Sponsor & Headline</th>
                <th className="p-4">Zone</th>
                <th className="p-4">Impressions</th>
                <th className="p-4">Clicks</th>
                <th className="p-4">CTR</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-paper-warm/50">
                  <td className="p-4">
                    <div className="font-bold text-ink text-sm">{c.sponsor}</div>
                    <div className="text-ink-muted text-xs line-clamp-1">{c.headline}</div>
                  </td>
                  <td className="p-4 font-semibold text-ink-soft">{c.zone}</td>
                  <td className="p-4 font-bold text-ink">{c.impressions.toLocaleString()}</td>
                  <td className="p-4 font-bold text-ink">{c.clicks.toLocaleString()}</td>
                  <td className="p-4 font-bold text-success">{c.ctr}</td>
                  <td className="p-4">
                    <span className="badge-base badge-success">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
