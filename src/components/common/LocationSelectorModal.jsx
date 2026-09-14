import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  MapPin, Navigation, Search, X, Check, Globe, Sliders, 
  Bookmark, Trash2, ArrowRight, Loader2, Compass, AlertCircle
} from 'lucide-react';

const RADIUS_OPTIONS = [
  { value: 1, label: '1 km', desc: 'Walking distance' },
  { value: 2, label: '2 km', desc: 'Immediate neighbourhood' },
  { value: 5, label: '5 km', desc: 'Local suburb radius' },
  { value: 10, label: '10 km', desc: 'Metro sub-district' },
  { value: 25, label: '25 km', desc: 'Wider metropolitan area' },
  { value: 50, label: '50 km', desc: 'Regional perimeter' },
  { value: 100, label: '100 km', desc: 'District municipality' },
  { value: 'all', label: 'View All', desc: 'South Africa entire feed' }
];

const POPULAR_AREAS = [
  { suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', latitude: -26.1076, longitude: 28.0567 },
  { suburb: 'Rosebank', city: 'Johannesburg', province: 'Gauteng', latitude: -26.1465, longitude: 28.0436 },
  { suburb: 'Alberton North', city: 'Alberton', province: 'Gauteng', latitude: -26.2625, longitude: 28.1250 },
  { suburb: 'Cape Town City Centre', city: 'Cape Town', province: 'Western Cape', latitude: -33.9249, longitude: 18.4241 },
  { suburb: 'Durban Central', city: 'Durban', province: 'KwaZulu-Natal', latitude: -29.8587, longitude: 31.0218 },
  { suburb: 'Pretoria Central', city: 'Pretoria', province: 'Gauteng', latitude: -25.7479, longitude: 28.1878 },
  { suburb: 'Gqeberha Central', city: 'Gqeberha', province: 'Eastern Cape', latitude: -33.9608, longitude: 25.6022 },
  { suburb: 'Polokwane Central', city: 'Polokwane', province: 'Limpopo', latitude: -23.9045, longitude: 29.4688 }
];

export default function LocationSelectorModal({ isOpen, onClose }) {
  const {
    activeLocation,
    selectLocation,
    detectCurrentLocation,
    isDetectingLocation,
    radius,
    setRadius,
    user,
    savedLocations,
    saveUserLocation,
    removeUserLocation,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'browse' | 'map' | 'saved'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Province & City Hierarchy state
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [suburbs, setSuburbs] = useState([]);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);

  // Mode C: Manual Coordinates State
  const [manualLat, setManualLat] = useState(activeLocation?.latitude || -26.2625);
  const [manualLng, setManualLng] = useState(activeLocation?.longitude || 28.1250);
  const [manualResolved, setManualResolved] = useState(null);
  const [isResolvingManual, setIsResolvingManual] = useState(false);

  // Saved location label input
  const [saveLabel, setSaveLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const searchDebounceRef = useRef(null);
  const modalRef = useRef(null);

  // Load provinces on mount
  useEffect(() => {
    if (isOpen && provinces.length === 0) {
      api.getProvinces()
        .then(data => setProvinces(data))
        .catch(err => console.warn('Could not load provinces:', err));
    }
  }, [isOpen]);

  // Sync manual lat/lng and lock background scroll when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (activeLocation) {
        setManualLat(activeLocation.latitude);
        setManualLng(activeLocation.longitude);
        setManualResolved(activeLocation);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, activeLocation]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await api.searchLocations(searchQuery.trim(), { limit: 12 });
        setSearchResults(results || []);
      } catch (err) {
        console.warn('Location search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Handle province click
  const handleSelectProvince = async (provName) => {
    setSelectedProvince(provName);
    setSelectedCity(null);
    setSuburbs([]);
    setIsLoadingHierarchy(true);
    try {
      const cityList = await api.getCities(provName);
      setCities(cityList || []);
    } catch (e) {
      console.warn('Error loading cities:', e);
    } finally {
      setIsLoadingHierarchy(false);
    }
  };

  // Handle city click
  const handleSelectCity = async (cityObj) => {
    setSelectedCity(cityObj.city);
    setIsLoadingHierarchy(true);
    try {
      const suburbList = await api.getSuburbs(cityObj.city, selectedProvince);
      setSuburbs(suburbList || []);
    } catch (e) {
      console.warn('Error loading suburbs:', e);
    } finally {
      setIsLoadingHierarchy(false);
    }
  };

  // Resolve manual coordinates
  const handleResolveCoordinates = async () => {
    setIsResolvingManual(true);
    try {
      const rev = await api.reverseGeocode(manualLat, manualLng);
      if (rev) {
        setManualResolved(rev);
        addToast(`Resolved: ${rev.label}`, 'success');
      } else {
        addToast('No recognized place near these coordinates.', 'warning');
      }
    } catch (err) {
      addToast(err.message || 'Geocoding failed', 'error');
    } finally {
      setIsResolvingManual(false);
    }
  };

  const handleApplyManualCoordinates = () => {
    selectLocation({
      latitude: Number(manualLat),
      longitude: Number(manualLng),
      suburb: manualResolved?.suburb || 'Custom Coordinates',
      city: manualResolved?.city || 'South Africa',
      province: manualResolved?.province || 'Gauteng',
      label: manualResolved?.label || `Coordinates (${Number(manualLat).toFixed(3)}, ${Number(manualLng).toFixed(3)})`
    }, 'MAP_PIN');
    onClose();
  };

  const handleSaveCurrentLocation = async (e) => {
    e.preventDefault();
    if (!saveLabel.trim()) return;
    setIsSaving(true);
    try {
      await saveUserLocation({
        label: saveLabel.trim(),
        suburb: activeLocation?.suburb,
        city: activeLocation?.city,
        province: activeLocation?.province,
        latitude: activeLocation?.latitude,
        longitude: activeLocation?.longitude,
        locationMode: activeLocation?.mode || 'MANUAL_LOCATION'
      });
      setSaveLabel('');
    } catch (err) {
      // Error handled by context toast
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-paper rounded-3xl border border-ink/15 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between bg-paper-warm/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-deep">
              <MapPin size={18} />
            </div>
            <div>
              <h2 id="location-modal-title" className="text-base font-bold text-ink leading-tight">
                Discovery Location & Area
              </h2>
              <p className="text-xs text-ink-muted">
                Explore businesses, products, services & specials anywhere in South Africa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
            aria-label="Close location selector"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Active Location Bar */}
        <div className="px-6 py-3 bg-accent/10 border-b border-accent/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-ink">
              {activeLocation?.mode === 'GPS_CURRENT' ? '🎯 Current GPS' : 
               activeLocation?.mode === 'MAP_PIN' ? '🗺️ Coordinate Pin' : '📌 Selected Area'}
            </span>
            <span className="text-xs font-bold text-ink">
              {activeLocation?.label || `${activeLocation?.suburb}, ${activeLocation?.city}`}
            </span>
            <span className="text-xs text-ink-muted hidden sm:inline">
              ({activeLocation?.province})
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span>Radius:</span>
            <span className="font-bold text-accent-deep">
              {radius === 'all' ? 'All SA' : `${radius} km`}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-ink/10 px-6 pt-2 bg-paper gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'search'
                ? 'border-accent text-ink font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Search size={14} />
            <span>Search Places</span>
          </button>

          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'browse'
                ? 'border-accent text-ink font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Globe size={14} />
            <span>9 Provinces</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'map'
                ? 'border-accent text-ink font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Compass size={14} />
            <span>Coordinates & Pin</span>
          </button>

          {user && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'border-accent text-ink font-bold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Bookmark size={14} />
              <span>Saved Areas ({savedLocations?.length || 0})</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick GPS Mode A Button */}
          <div className="bg-gradient-to-r from-accent/15 via-amber-500/10 to-transparent p-4 rounded-2xl border border-accent/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent text-ink flex items-center justify-center shrink-0 shadow-sm">
                <Navigation size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-ink">Mode A: Use My Real-Time Location</h3>
                <p className="text-[11px] text-ink-soft">
                  Auto-detect GPS to discover micro-enterprises and service pros right outside your door
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                detectCurrentLocation();
                onClose();
              }}
              disabled={isDetectingLocation}
              className="px-4 py-2 bg-ink text-paper rounded-xl text-xs font-bold hover:bg-ink-soft active:scale-95 transition-all shrink-0 flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isDetectingLocation ? (
                <>
                  <Loader2 size={13} className="animate-spin text-accent" />
                  <span>Detecting...</span>
                </>
              ) : (
                <>
                  <Navigation size={13} className="text-accent" />
                  <span>Locate Me</span>
                </>
              )}
            </button>
          </div>

          {/* TAB 1: Search & Autocomplete */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Type any suburb, town, city, postal code or landmark (e.g. Rosebank, Soweto, Bellville)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-paper-warm border border-ink/20 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-medium text-ink placeholder-ink-muted focus:outline-none focus:border-accent focus:bg-paper focus:ring-2 focus:ring-accent/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Results */}
              {isSearching && (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-ink-muted">
                  <Loader2 size={16} className="animate-spin text-accent-deep" />
                  <span>Searching South African localities...</span>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="border border-ink/10 rounded-2xl divide-y divide-ink/5 overflow-hidden shadow-sm">
                  {searchResults.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      onClick={() => {
                        selectLocation(item, 'MANUAL_LOCATION');
                        onClose();
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-paper-warm flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-ink/5 group-hover:bg-accent/20 text-ink-muted group-hover:text-ink flex items-center justify-center transition-colors">
                          <MapPin size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                            <span>{item.suburb || item.city}</span>
                            {item.locationType && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-ink/10 text-ink-muted capitalize">
                                {item.locationType}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-soft">
                            {item.city !== item.suburb && `${item.city}, `}{item.province}
                            {item.postalCode ? ` • ${item.postalCode}` : ''}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-accent-deep opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <span>Select</span>
                        <ArrowRight size={12} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Popular Area Chips */}
              {(!searchQuery || searchResults.length === 0) && !isSearching && (
                <div>
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                    Quick Select Popular Hubs
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {POPULAR_AREAS.map((area) => (
                      <button
                        key={`${area.city}-${area.suburb}`}
                        onClick={() => {
                          selectLocation(area, 'MANUAL_LOCATION');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl border border-ink/10 bg-paper hover:bg-accent/10 hover:border-accent/40 text-left transition-all group"
                      >
                        <div className="text-xs font-bold text-ink group-hover:text-accent-deep truncate">
                          {area.suburb}
                        </div>
                        <div className="text-[10px] text-ink-muted truncate">
                          {area.city}, {area.province}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Province & City Hierarchy Drilldown */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              <div className="text-xs text-ink-soft">
                Drill down through South Africa's 9 provinces to explore specific municipalities, metros, and local suburbs.
              </div>

              {/* Step 1: Province Selection */}
              <div>
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                  1. Select Province
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {provinces.map((prov) => (
                    <button
                      key={prov.province}
                      onClick={() => handleSelectProvince(prov.province)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                        selectedProvince === prov.province
                          ? 'border-accent bg-accent/20 font-bold text-ink shadow-sm'
                          : 'border-ink/10 bg-paper hover:bg-paper-warm text-ink-soft'
                      }`}
                    >
                      <div className="truncate font-semibold">{prov.province}</div>
                      <div className="text-[10px] text-ink-muted">
                        {prov.totalLocations} localities
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: City / Town Selection */}
              {selectedProvince && (
                <div className="animate-in fade-in pt-2">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                    2. Cities in {selectedProvince}
                  </div>
                  {isLoadingHierarchy && cities.length === 0 ? (
                    <div className="py-4 text-xs text-ink-muted flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-accent-deep" />
                      <span>Loading cities...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-ink/10 rounded-xl">
                      {cities.map((c) => (
                        <button
                          key={c.city}
                          onClick={() => handleSelectCity(c)}
                          className={`p-2 rounded-lg text-left text-xs transition-colors ${
                            selectedCity === c.city
                              ? 'bg-ink text-paper font-bold'
                              : 'hover:bg-paper-warm text-ink'
                          }`}
                        >
                          <div className="truncate font-medium">{c.city}</div>
                          {c.municipality && (
                            <div className="text-[9px] text-ink-muted truncate">
                              {c.municipality}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Suburb Selection or Select City Entirety */}
              {selectedCity && (
                <div className="animate-in fade-in pt-2 border-t border-ink/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      3. Suburbs in {selectedCity}
                    </div>
                    {/* Quick Select Entire City */}
                    <button
                      onClick={() => {
                        const targetCity = cities.find(c => c.city === selectedCity);
                        if (targetCity) {
                          selectLocation({
                            latitude: targetCity.latitude,
                            longitude: targetCity.longitude,
                            city: targetCity.city,
                            suburb: targetCity.city,
                            province: selectedProvince,
                            label: `${targetCity.city}, ${selectedProvince}`
                          }, 'MANUAL_LOCATION');
                          onClose();
                        }
                      }}
                      className="text-xs font-bold text-accent-deep hover:underline"
                    >
                      Select entire {selectedCity}
                    </button>
                  </div>

                  {suburbs.length === 0 ? (
                    <div className="text-xs text-ink-muted py-2">
                      No listed suburbs for this city. Select the city directly using the button above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {suburbs.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            selectLocation(sub, 'MANUAL_LOCATION');
                            onClose();
                          }}
                          className="p-2 rounded-lg border border-ink/10 bg-paper hover:bg-accent/15 hover:border-accent text-left text-xs transition-colors"
                        >
                          <div className="font-semibold text-ink truncate">{sub.suburb}</div>
                          <div className="text-[10px] text-ink-muted">
                            {sub.postalCode || selectedCity}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Mode C - Coordinates & Interactive Pin */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-paper-warm border border-ink/15 space-y-3">
                <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Compass size={14} className="text-accent-deep" />
                  <span>Mode C: Coordinates Pinpoint Picker</span>
                </h4>
                <p className="text-[11px] text-ink-soft leading-relaxed">
                  Enter geographic coordinates anywhere in South Africa (Latitude: -35 to -22, Longitude: 16 to 33) to anchor your discovery radius to exact GPS coordinates or rural plots.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      className="w-full bg-paper border border-ink/20 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      className="w-full bg-paper border border-ink/20 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleResolveCoordinates}
                    disabled={isResolvingManual}
                    className="px-3 py-1.5 bg-paper border border-ink/20 hover:border-ink/50 rounded-xl text-xs font-semibold text-ink flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isResolvingManual ? (
                      <Loader2 size={12} className="animate-spin text-accent-deep" />
                    ) : (
                      <Search size={12} />
                    )}
                    <span>Verify Nearest Place</span>
                  </button>

                  <button
                    onClick={handleApplyManualCoordinates}
                    className="px-4 py-1.5 bg-ink text-paper rounded-xl text-xs font-bold hover:bg-ink-soft transition-all shadow-sm"
                  >
                    Set Active Pin
                  </button>
                </div>

                {manualResolved && (
                  <div className="p-3 bg-paper rounded-xl border border-accent/40 text-xs mt-2">
                    <div className="font-bold text-ink flex items-center gap-1">
                      <Check size={14} className="text-emerald-600" />
                      <span>{manualResolved.label || `${manualResolved.suburb}, ${manualResolved.city}`}</span>
                    </div>
                    <div className="text-[10px] text-ink-muted mt-0.5">
                      {manualResolved.province} • Approx. {manualLat}, {manualLng}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Saved Locations (Authenticated Users) */}
          {activeTab === 'saved' && user && (
            <div className="space-y-4">
              {/* Add current location to saved */}
              <form onSubmit={handleSaveCurrentLocation} className="p-3 bg-paper-warm rounded-2xl border border-ink/10 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Label current area (e.g. Home, Office, Workshop)..."
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  className="flex-1 bg-paper border border-ink/20 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={isSaving || !saveLabel.trim()}
                  className="px-3 py-2 bg-ink text-paper rounded-xl text-xs font-bold hover:bg-ink-soft disabled:opacity-40 transition-colors shrink-0"
                >
                  Save Current
                </button>
              </form>

              {/* Saved items list */}
              {savedLocations?.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-muted">
                  No saved areas yet. Save your frequent neighborhoods above for instant one-click switching.
                </div>
              ) : (
                <div className="space-y-2">
                  {savedLocations?.map((loc) => (
                    <div
                      key={loc.id}
                      className="p-3 rounded-2xl border border-ink/10 bg-paper hover:border-accent/50 flex items-center justify-between group transition-colors"
                    >
                      <button
                        onClick={() => {
                          selectLocation(loc, 'SAVED_LOCATION');
                          onClose();
                        }}
                        className="flex items-center gap-3 text-left flex-1"
                      >
                        <div className="w-8 h-8 rounded-xl bg-accent/20 text-accent-deep flex items-center justify-center shrink-0">
                          <Bookmark size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">{loc.label}</div>
                          <div className="text-[11px] text-ink-soft">
                            {loc.suburb ? `${loc.suburb}, ` : ''}{loc.city} ({loc.province})
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => removeUserLocation(loc.id)}
                        className="text-ink-muted hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete saved area"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Radius Controls */}
          <div className="pt-4 border-t border-ink/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Sliders size={13} className="text-accent-deep" />
                <span>Discovery Radius Filter</span>
              </span>
              <span className="text-xs font-extrabold text-accent-deep">
                {radius === 'all' ? 'All South Africa' : `${radius} km`}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {RADIUS_OPTIONS.map((opt) => {
                const isSelected = String(radius) === String(opt.value);
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => setRadius(opt.value)}
                    title={opt.desc}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-ink text-paper border-ink shadow-sm'
                        : 'bg-paper hover:bg-paper-warm border-ink/15 text-ink-soft'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-ink-muted text-right">
              {radius === 'all' ? 'Showing businesses nationwide across all 9 provinces' : `Only showing merchants and services within ${radius} km of your chosen location`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-ink/10 bg-paper-warm/50 flex items-center justify-between">
          <div className="text-[11px] text-ink-soft">
            Active: <strong className="text-ink">{activeLocation?.label || activeLocation?.city}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-ink text-paper rounded-xl text-xs font-bold hover:bg-ink-soft active:scale-95 transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
