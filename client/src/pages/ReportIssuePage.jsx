import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { saveDraft } from '../utils/offlineDrafts';
import CivicMap from '../components/CivicMap';
import { getAllStates, getDistrictsForState } from '../utils/indiaGeoData';
import {
  Trash2,
  Construction,
  AlertTriangle,
  Droplets,
  Waves,
  Lightbulb,
  Sparkles,
  HelpCircle,
  Upload,
  Image as ImageIcon,
  MapPin,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  AlertCircle,
  ThumbsUp,
  ExternalLink,
  Wand2,
  Zap,
  Trees,
  Building2,
  Landmark,
  ShieldAlert,
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Roads and Potholes': Construction,
  'Water Supply': Droplets,
  'Drainage and Sewage': Waves,
  'Garbage Management': Trash2,
  'Electricity Infrastructure': Zap,
  'Street Lights': Lightbulb,
  'Public Sanitation': Sparkles,
  'Public Parks': Trees,
  'Public Infrastructure': Building2,
  'Government Facilities': Landmark,
  'Public Safety Infrastructure': ShieldAlert,
  'Other Civic Issues': HelpCircle,
  'Garbage and Waste': Trash2,
  'Road Damage': Construction,
  'Potholes': AlertTriangle,
  'Water Leakage': Droplets,
  'Drainage Problems': Waves,
  'Streetlight Issues': Lightbulb,
};

export default function ReportIssuePage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated, authFetch } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offlineSavedMsg, setOfflineSavedMsg] = useState('');

  // Form Fields (Pan-India Dynamic Geographic Hierarchy)
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [ward, setWard] = useState(user?.ward || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [state, setState] = useState(user?.state || '');
  const [locationCoords, setLocationCoords] = useState(user?.latitude && user?.longitude ? { lat: user.latitude, lng: user.longitude } : { lat: 20.5937, lng: 78.9629 });
  const [locationSource, setLocationSource] = useState('MAP_PIN'); // 'GPS' | 'MAP_PIN' | 'SEARCH' | 'MANUAL'
  const [locatingUser, setLocatingUser] = useState(false);

  // Duplicate Check
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [relatedComplaintId, setRelatedComplaintId] = useState(null);

  // Submission Outcome
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [aiEnhanceLoading, setAiEnhanceLoading] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/complaints/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  // Handle Photo selection
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (photos.length + files.length > 5) {
      setError('You can upload a maximum of 5 evidence photographs.');
      return;
    }

    const validFiles = [];
    const validPreviews = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} exceeds the 10MB limit.`);
        continue;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        setError(`File ${file.name} is not a supported image format.`);
        continue;
      }

      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setPhotos([...photos, ...validFiles]);
    setPhotoPreviews([...photoPreviews, ...validPreviews]);
    setError('');
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    const newPreviews = [...photoPreviews];
    newPhotos.splice(index, 1);
    newPreviews.splice(index, 1);
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };

  // Callback when location is pinned, searched, or geocoded on map
  const handleMapLocationSelect = ({ lat, lng, source, addressDetails }) => {
    setLocationCoords({ lat, lng });
    if (source) setLocationSource(source);
    if (addressDetails) {
      if (addressDetails.address) setAddress(addressDetails.address);
      if (addressDetails.locality) setLocality(addressDetails.locality);
      if (addressDetails.landmark && !landmark) setLandmark(addressDetails.landmark);
      if (addressDetails.city) setCity(addressDetails.city);
      if (addressDetails.district) setDistrict(addressDetails.district);
      if (addressDetails.state) setState(addressDetails.state);
      if (addressDetails.pincode) setPincode(addressDetails.pincode);
    }
  };

  // Get current GPS location directly
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lng = parseFloat(pos.coords.longitude.toFixed(5));
        setLocationCoords({ lat, lng });
        setLocationSource('GPS');
        setLocatingUser(false);
        setError('');
      },
      (err) => {
        setLocatingUser(false);
        setError('Location permission unavailable. You can search or pin your location directly on the map.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Trigger Duplicate Check when moving to Review Step
  const proceedToReview = async () => {
    if (!address.trim()) {
      setError('Please provide a street address or locality.');
      return;
    }

    setError('');
    setCheckingDuplicates(true);
    setStep(4);

    try {
      const res = await fetch('/api/complaints/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedCategory.id,
          title,
          description,
          latitude: locationCoords.lat,
          longitude: locationCoords.lng,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDuplicateMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Duplicate check error:', err);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // AI Description Enhancer (Section 18)
  const handleEnhanceDescription = async () => {
    if (!description.trim()) {
      setError('Please write at least a brief phrase first to enhance.');
      return;
    }

    setAiEnhanceLoading(true);
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPROVE_DESCRIPTION',
          description,
          category: selectedCategory?.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.improvedText) {
          setDescription(data.improvedText);
        }
      }
    } catch (err) {
      console.error('AI assistant error:', err);
    } finally {
      setAiEnhanceLoading(false);
    }
  };

  // Save offline draft to IndexedDB
  const handleSaveDraft = async () => {
    try {
      if (!title.trim() && !description.trim()) {
        setError('Please provide at least a title or description to save an offline draft.');
        return;
      }
      await saveDraft({
        category_id: selectedCategory?.id || null,
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        locality: locality.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        district,
        state,
        ward,
        latitude: locationCoords.lat,
        longitude: locationCoords.lng,
        location_source: locationSource,
      });
      setOfflineSavedMsg('Draft saved securely to offline IndexedDB! You can review and submit it anytime from "My Complaints".');
      setTimeout(() => setOfflineSavedMsg(''), 5000);
    } catch (err) {
      console.error('Failed to save draft:', err);
      setError('Could not save offline draft.');
    }
  };

  // Submit Complaint
  const handleSubmitComplaint = async () => {
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('category_id', selectedCategory.id);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('address', address.trim());
      if (locality) formData.append('locality', locality.trim());
      if (city) formData.append('city', city.trim());
      if (pincode) formData.append('pincode', pincode.trim());
      if (landmark) formData.append('landmark', landmark.trim());
      formData.append('district', district.trim());
      formData.append('state', state.trim());
      if (ward) formData.append('ward', ward.trim());
      formData.append('latitude', locationCoords.lat);
      formData.append('longitude', locationCoords.lng);
      formData.append('location_source', locationSource);
      if (relatedComplaintId) formData.append('related_complaint_id', relatedComplaintId);

      for (const file of photos) {
        formData.append('photos', file);
      }

      const res = await authFetch('/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit complaint.');
      }

      setSubmittedComplaint(data.complaint);
    } catch (err) {
      setError(err.message || 'Could not submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Support an existing complaint found during duplicate check
  const handleSupportExisting = async (complaintId) => {
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }

    try {
      const res = await authFetch(`/api/complaints/${complaintId}/support`, { method: 'POST' });
      if (res.ok) {
        const complaint = duplicateMatches.find((m) => m.complaint.id === complaintId)?.complaint;
        if (complaint) {
          onNavigate('track', complaint.complaint_code);
        }
      }
    } catch (err) {
      console.error('Support error:', err);
    }
  };

  // If complaint successfully submitted, show confirmation screen
  if (submittedComplaint) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 bg-[#F4F7F8]">
        <div className="bg-white rounded-2xl border border-[#DCE5E9] p-8 text-center shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-[#328568]/30 text-[#328568] flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-[#193B50]">Civic Grievance Successfully Lodged!</h2>
            <p className="text-xs text-[#64748B]">
              Your issue has been formally recorded with the responsible municipal authority.
            </p>
          </div>

          <div className="bg-[#F4F7F8] rounded-xl p-5 border border-[#DCE5E9] max-w-md mx-auto space-y-2.5 text-left text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Tracking Code:</span>
              <span className="font-extrabold text-[#193B50] font-mono text-sm bg-white px-2.5 py-0.5 rounded-md border border-[#DCE5E9]">
                {submittedComplaint.complaint_code}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Advisory Priority:</span>
              <span className="font-bold text-[#193B50]">{submittedComplaint.priority}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">SLA Resolution Target:</span>
              <span className="font-bold text-[#287C78]">
                {new Date(submittedComplaint.sla_deadline).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => onNavigate('track', submittedComplaint.complaint_code)}
              className="px-6 py-2.5 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] transition-colors shadow-xs"
            >
              Track This Complaint
            </button>
            <button
              onClick={() => {
                setSubmittedComplaint(null);
                setStep(1);
                setTitle('');
                setDescription('');
                setPhotos([]);
                setPhotoPreviews([]);
                setSelectedCategory(null);
              }}
              className="px-6 py-2.5 bg-white border border-[#DCE5E9] text-[#193B50] rounded-lg text-xs font-bold hover:bg-[#F4F7F8]"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-[#F4F7F8]">
      {/* Guided Step Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#DCE5E9] -translate-y-1/2 -z-10" />

          {[
            { num: 1, title: 'Category' },
            { num: 2, title: 'Details & Photos' },
            { num: 3, title: 'Location' },
            { num: 4, title: 'Review & Submit' },
          ].map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center bg-[#F4F7F8] px-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#287C78] text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#193B50] text-white ring-4 ring-[#193B50]/15 shadow-xs'
                      : 'bg-white border-2 border-[#DCE5E9] text-[#64748B]'
                  }`}
                >
                  {isCompleted ? '✓' : s.num}
                </div>
                <span
                  className={`text-[11px] font-bold mt-1.5 whitespace-nowrap ${
                    isCurrent ? 'text-[#193B50]' : 'text-[#64748B]'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-[#C65B5B]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-[#C65B5B] hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offline Saved Success Notice */}
      {offlineSavedMsg && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-[#1F5441]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#328568] shrink-0" />
            <span>{offlineSavedMsg}</span>
          </div>
          <button onClick={() => setOfflineSavedMsg('')} className="text-[#1F5441] hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: SELECT CATEGORY */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#DCE5E9] p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-[#193B50]">Step 1: Select Issue Category</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Choose the category that best matches the civic grievance you observed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {categories.map((cat) => {
              const IconComp = CATEGORY_ICONS[cat.name] || HelpCircle;
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setError('');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-[#287C78]/10 border-[#287C78] ring-1 ring-[#287C78] shadow-xs'
                      : 'border-[#DCE5E9] hover:border-[#193B50] hover:bg-[#F4F7F8]/50'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg ${
                      isSelected ? 'bg-[#287C78] text-white' : 'bg-[#F4F7F8] text-[#193B50]'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#193B50]">{cat.name}</h4>
                      <span className="text-[10px] text-[#64748B] uppercase font-semibold">
                        SLA: {cat.default_priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1 leading-snug">{cat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-[#DCE5E9]/60">
            <button
              onClick={() => {
                if (!selectedCategory) {
                  setError('Please select an issue category to proceed.');
                  return;
                }
                setStep(2);
              }}
              className="px-6 py-2.5 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] flex items-center gap-2 shadow-xs transition-colors"
            >
              Continue to Details
              <ArrowRight className="w-4 h-4 text-[#D6A64F]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DESCRIBE ISSUE & UPLOAD PHOTOS */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#DCE5E9] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#193B50]">Step 2: Describe the Issue</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Category:{' '}
                <span className="font-bold text-[#287C78]">{selectedCategory?.name}</span>
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-[#64748B] hover:text-[#193B50] flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Change Category
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#193B50] mb-1">
                Complaint Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep road crater near Aerodrome Circle flyover"
                className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-[#193B50]">
                  Detailed Description *
                </label>
                <button
                  type="button"
                  disabled={aiEnhanceLoading}
                  onClick={handleEnhanceDescription}
                  className="text-[11px] text-[#287C78] hover:text-[#1F6360] font-bold flex items-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#D6A64F]" />
                  {aiEnhanceLoading ? 'Improving...' : 'AI Assist: Clarify Civic Phrasing'}
                </button>
              </div>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail, noting approximate dimensions, immediate hazards, or duration observed..."
                className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
              />
            </div>

            {/* Photo Upload Section */}
            <div>
              <label className="block text-xs font-bold text-[#193B50] mb-1">
                Supporting Photographs (Up to 5 images, Max 10MB each)
              </label>
              <div className="border-2 border-dashed border-[#DCE5E9] rounded-xl p-6 text-center hover:bg-[#F4F7F8] transition-colors relative">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#193B50]">
                  Click or drag images here to upload evidence
                </p>
                <p className="text-[10px] text-[#64748B] mt-0.5">JPEG, PNG, WebP supported</p>
              </div>

              {/* Photo Previews */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
                  {photoPreviews.map((src, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-[#DCE5E9] aspect-square shadow-2xs">
                      <img src={src} alt="Evidence" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-[#C65B5B] text-white rounded-full hover:bg-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#DCE5E9]/60">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-[#DCE5E9] text-[#193B50] rounded-lg text-xs font-bold hover:bg-[#F4F7F8]"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (!title.trim() || !description.trim()) {
                  setError('Please fill in both the complaint title and description.');
                  return;
                }
                setStep(3);
              }}
              className="px-6 py-2.5 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] flex items-center gap-2 shadow-xs"
            >
              Continue to Location
              <ArrowRight className="w-4 h-4 text-[#D6A64F]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SELECT LOCATION */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[#DCE5E9] p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[#193B50]">Step 3: Pinpoint Issue Location</h2>
              <div className="flex items-center gap-2">
                {locationSource === 'GPS' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#328568] border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> GPS Verified
                  </span>
                )}
                {locationSource === 'MAP_PIN' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-[#287C78] border border-teal-200">
                    <MapPin className="w-3 h-3" /> Map Pinned
                  </span>
                )}
                {locationSource === 'SEARCH' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-[#193B50] border border-sky-200">
                    🔍 Place Search
                  </span>
                )}
                {locationSource === 'MANUAL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#64748B] border border-slate-200">
                    ✏️ Manual Entry
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Supports any location across India. Search a place, tap the GPS button, or click/drag the pin on the map.
            </p>
          </div>

          {/* Interactive Map Picker with India Coverage, Search & GPS */}
          <div className="space-y-1">
            <CivicMap
              selectedLocation={locationCoords}
              onLocationSelect={handleMapLocationSelect}
              center={[locationCoords.lat, locationCoords.lng]}
              zoom={14}
              height="380px"
              enableSearch={true}
              enableGps={true}
            />
            <div className="flex flex-wrap justify-between items-center text-[11px] text-[#64748B] font-mono px-1 gap-2">
              <span>Latitude: {locationCoords.lat} | Longitude: {locationCoords.lng}</span>
              <span className="text-[10px] text-[#287C78]">Coordinates auto-sync with reverse geocoding</span>
            </div>
          </div>

          {/* Structured Geographic & Address Fields */}
          <div className="pt-2 border-t border-[#DCE5E9]/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#193B50] mb-3">
              Geographic Hierarchy &amp; Street Address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* State / UT */}
              <div>
                <label className="block text-xs font-bold text-[#193B50] mb-1">State / Union Territory *</label>
                <select
                  value={state}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setState(newState);
                    const dists = getDistrictsForState(newState);
                    setDistrict(dists.length > 0 ? dists[0] : '');
                    setLocationSource('MANUAL');
                  }}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                >
                  {getAllStates().map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-bold text-[#193B50] mb-1">District *</label>
                {getDistrictsForState(state).length > 0 ? (
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setLocationSource('MANUAL');
                    }}
                    className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                  >
                    {getDistrictsForState(state).map((dst) => (
                      <option key={dst} value={dst}>{dst}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setLocationSource('MANUAL');
                    }}
                    placeholder="Enter district name"
                    className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                  />
                )}
              </div>

              {/* City / Town */}
              <div>
                <label className="block text-xs font-bold text-[#193B50] mb-1">City / Town</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setLocationSource('MANUAL');
                  }}
                  placeholder="e.g. Mumbai / Jaipur / Delhi / Bengaluru"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                />
              </div>

              {/* Locality / Suburb */}
              <div>
                <label className="block text-xs font-bold text-[#193B50] mb-1">Locality / Area</label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => {
                    setLocality(e.target.value);
                    setLocationSource('MANUAL');
                  }}
                  placeholder="e.g. Vigyan Nagar / Talwandi"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                />
              </div>

              {/* Street Address / Road */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#193B50] mb-1">
                  Street Address / Road / Sector *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setLocationSource('MANUAL');
                  }}
                  placeholder="e.g. Road No. 3, Near City Mall, Jhalawar Road"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                />
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-xs font-bold text-[#193B50] mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Aerodrome Flyover"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                />
              </div>

              {/* PIN Code */}
              <div>
                <label className="block text-xs font-bold text-[#193B50] mb-1">PIN Code (6 digits)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 324005"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                />
              </div>

              {/* Municipal Ward / Zone (Optional) */}
              <div>
                <label className="block text-xs font-bold text-[#193B50] mb-1">
                  Municipal Ward / Zone
                </label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="e.g. Ward / Zone (if applicable)"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#DCE5E9]/60">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-[#DCE5E9] text-[#193B50] rounded-lg text-xs font-bold hover:bg-[#F4F7F8]"
            >
              Back
            </button>
            <button
              onClick={proceedToReview}
              className="px-6 py-2.5 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] flex items-center gap-2 shadow-xs"
            >
              Review &amp; Check Duplicates
              <ArrowRight className="w-4 h-4 text-[#D6A64F]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DUPLICATE CHECK & REVIEW */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-[#DCE5E9] p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-[#193B50]">Step 4: Duplicate Analysis &amp; Final Review</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Review your complaint details. We scan for similar nearby reports so citizens can unite on community issues.
            </p>
          </div>

          {/* Duplicate Matches Banner */}
          {checkingDuplicates ? (
            <div className="p-6 text-center text-xs text-[#64748B] bg-[#F4F7F8] rounded-xl border border-[#DCE5E9]">
              Scanning for existing complaints in your vicinity...
            </div>
          ) : duplicateMatches.length > 0 ? (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-[#D49A37]" />
                <span>Found {duplicateMatches.length} Similar Existing Complaint(s) Nearby:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                A similar issue may already be under municipal review. You can lend your support to the
                existing complaint to increase its urgency, or continue submitting your own report.
              </p>

              <div className="space-y-2 mt-2">
                {duplicateMatches.map((match, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#193B50] font-mono">{match.complaint.complaint_code}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                          {match.similarityPercentage}% Match
                        </span>
                        {match.distanceMeters != null && (
                          <span className="text-[10px] text-[#64748B]">
                            ({match.distanceMeters}m away)
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-[#253746] mt-0.5">{match.complaint.title}</p>
                      <p className="text-[11px] text-[#64748B]">{match.complaint.address}</p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSupportExisting(match.complaint.id)}
                        className="px-3.5 py-1.5 bg-[#287C78] text-white rounded-lg text-xs font-bold hover:bg-[#1F6360] flex items-center gap-1 shadow-xs"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        Support Existing ({match.complaint.support_count || 0})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/80 border border-[#328568]/30 rounded-xl text-xs text-[#1F5441] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#328568]" />
              <span>No duplicates found. Your issue is unique in this vicinity.</span>
            </div>
          )}

          {/* Submission Summary Card */}
          <div className="bg-[#F4F7F8] rounded-xl p-5 border border-[#DCE5E9] space-y-3 text-xs">
            <h3 className="font-bold text-[#193B50] uppercase tracking-wider text-[11px]">
              Complaint Submission Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[#64748B] block text-[11px]">Category:</span>
                <span className="font-bold text-[#193B50]">{selectedCategory?.name}</span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Jurisdiction:</span>
                <span className="font-bold text-[#193B50]">{district}, {state}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#64748B] block text-[11px]">Title:</span>
                <span className="font-bold text-[#193B50]">{title}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#64748B] block text-[11px]">Description:</span>
                <p className="text-[#253746] mt-0.5 leading-relaxed">{description}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#64748B] block text-[11px]">Exact Location:</span>
                <span className="text-[#253746] font-medium">{address} {landmark ? `(Near: ${landmark})` : ''}</span>
                <span className="text-[10px] text-[#64748B] block font-mono">
                  Coordinates: {locationCoords.lat}, {locationCoords.lng}
                </span>
              </div>
              {photos.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-[#64748B] block text-[11px] mb-1">Attached Evidence ({photos.length} photos):</span>
                  <div className="flex gap-2">
                    {photoPreviews.map((src, idx) => (
                      <img key={idx} src={src} alt="Evidence" className="w-12 h-12 object-cover rounded-lg border border-[#DCE5E9]" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[#DCE5E9]/60">
            <div className="flex gap-2">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-[#DCE5E9] text-[#193B50] rounded-lg text-xs font-bold hover:bg-[#F4F7F8]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-white border border-[#287C78] text-[#287C78] rounded-lg text-xs font-bold hover:bg-[#287C78]/5 transition-colors"
              >
                💾 Save as Offline Draft
              </button>
            </div>
            <button
              onClick={handleSubmitComplaint}
              disabled={loading}
              className="px-6 py-2.5 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {loading ? 'Submitting to Municipal Database...' : 'Submit Official Civic Complaint'}
              <CheckCircle className="w-4 h-4 text-[#D6A64F]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
