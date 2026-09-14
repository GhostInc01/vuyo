import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Heart, MapPin, Phone, HelpCircle } from 'lucide-react';

export default function Footer() {
  const { setPortal } = useApp();

  return (
    <footer className="bg-ink text-paper mt-16 border-t border-ink/20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent text-ink font-bold flex items-center justify-center font-display text-lg">
                L
              </div>
              <span className="font-display font-bold text-xl text-paper">LocalBiz South Africa</span>
            </div>
            <p className="text-xs text-paper/70 leading-relaxed mb-4">
              Empowering local township and suburban merchants, independent brand reps, and certified tradespeople with modern digital commerce.
            </p>
            <div className="flex items-center gap-2 text-xs text-accent font-semibold">
              <ShieldCheck size={16} />
              <span>100% Vetted Local Professionals</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-display font-bold text-sm text-paper mb-3 uppercase tracking-wider">Explore Portals</h4>
            <ul className="space-y-2 text-xs text-paper/70">
              <li>
                <button onClick={() => setPortal('consumer')} className="hover:text-accent transition-colors">
                  Consumer Marketplace
                </button>
              </li>
              <li>
                <button onClick={() => setPortal('merchant')} className="hover:text-accent transition-colors">
                  Merchant Hub (Seller Dashboard)
                </button>
              </li>
              <li>
                <button onClick={() => setPortal('advertiser')} className="hover:text-accent transition-colors">
                  Advertiser & Sponsor Portal
                </button>
              </li>
              <li>
                <button onClick={() => setPortal('admin')} className="hover:text-accent transition-colors">
                  Super Admin Management
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-display font-bold text-sm text-paper mb-3 uppercase tracking-wider">Popular Suburbs</h4>
            <ul className="space-y-2 text-xs text-paper/70">
              <li>Alberton North & New Redruth</li>
              <li>Alberton CBD & Raceview</li>
              <li>Meyersdal & Brackendowns</li>
              <li>Soweto & Johannesburg South</li>
              <li>East Rand & Meyerton</li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="font-display font-bold text-sm text-paper mb-3 uppercase tracking-wider">Merchant Support</h4>
            <p className="text-xs text-paper/70 leading-relaxed mb-3">
              Want to list your neighbourhood business or Avon / direct sales rep franchise?
            </p>
            <div className="space-y-1.5 text-xs text-paper/80">
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-accent" />
                <span>WhatsApp: +27 82 459 0000</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-accent" />
                <span>Gauteng, South Africa</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-paper/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-paper/50">
          <div>© 2026 LocalBizApp. Interactive Web Platform. All rights reserved.</div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            <span>Terms of Service</span>
            <span>•</span>
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Seller Verification Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
