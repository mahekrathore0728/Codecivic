import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Loader2, Navigation, AlertCircle, Check } from 'lucide-react';
import { reverseGeocode, searchLocation, isValidIndiaCoordinate } from '../utils/geocoding';

// Fix standard marker icon issues in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper for status & category colored markers with priority badges
const getMarkerIcon = (status, priority, categoryName) => {
  let color = '#193B50'; // Primary Navy default
  if (status === 'RESOLVED' || status === 'CLOSED') {
    color = '#328568'; // Success Green
  } else if (status === 'REOPENED' || priority === 'CRITICAL') {
    color = '#C65B5B'; // Error Red
  } else if (status === 'IN_PROGRESS' || status === 'ASSIGNED') {
    color = '#287C78'; // Secondary Teal
  } else if (status === 'UNDER_REVIEW') {
    color = '#D49A37'; // Warning Gold
  }

  // Category emoji indicator for quick civic classification
  let symbol = '⚠️';
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('garbage') || cat.includes('waste')) symbol = '🗑️';
  else if (cat.includes('pothole') || cat.includes('road')) symbol = '🚧';
  else if (cat.includes('water')) symbol = '💧';
  else if (cat.includes('drain')) symbol = '🌊';
  else if (cat.includes('light')) symbol = '💡';
  else if (cat.includes('sanitat')) symbol = '✨';

  const isCritical = priority === 'CRITICAL';

  return L.divIcon({
    className: 'custom-civic-marker',
    html: `
      <div style="position: relative; cursor: pointer;">
        <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 13px;">
          <span>${symbol}</span>
        </div>
        ${isCritical ? '<div style="position: absolute; top: -3px; right: -3px; width: 9px; height: 9px; background-color: #C65B5B; border: 1.5px solid white; border-radius: 50%; animation: pulse 1.5s infinite;"></div>' : ''}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

export default function CivicMap({
  complaints = [],
  hotspots = [],
  selectedLocation = null,
  onLocationSelect = null, // Callback receiving: { lat, lng, source, addressDetails }
  center = null, // If null and no selectedLocation, defaults to India [20.5937, 78.9629]
  zoom = null,
  onSelectComplaint = null,
  height = '440px',
  showHotspots = true,
  enableSearch = true,
  enableGps = true,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const hotspotsLayerRef = useRef(null);
  const selectionMarkerRef = useRef(null);

  // Search & GPS states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Default to India Center [20.5937, 78.9629] zoom 5 if no selected location
  const defaultCenter = center || (selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [20.5937, 78.9629]);
  const defaultZoom = zoom || (selectedLocation ? 14 : 5);

  // Trigger geocode resolution and propagate to parent
  const handleLocationUpdate = useCallback(async (lat, lng, source = 'MAP_PIN') => {
    if (!onLocationSelect) return;

    const roundedLat = parseFloat(lat.toFixed(5));
    const roundedLng = parseFloat(lng.toFixed(5));

    setReverseGeocoding(true);
    let addressDetails = null;

    try {
      const geoResult = await reverseGeocode(roundedLat, roundedLng);
      if (geoResult.success) {
        addressDetails = geoResult;
      }
    } catch (e) {
      console.warn('Geocoding lookup error:', e);
    } finally {
      setReverseGeocoding(false);
    }

    onLocationSelect({
      lat: roundedLat,
      lng: roundedLng,
      source,
      addressDetails,
    });
  }, [onLocationSelect]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      hotspotsLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Handle map clicks for location selection
      if (onLocationSelect) {
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          handleLocationUpdate(lat, lng, 'MAP_PIN');
        });
      }
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update selection marker for location picking
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (selectionMarkerRef.current) {
      selectionMarkerRef.current.remove();
      selectionMarkerRef.current = null;
    }

    if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
      const pinIcon = L.divIcon({
        className: 'selection-icon',
        html: `
          <div style="background-color: #193B50; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
            <div style="width: 10px; height: 10px; background-color: #D6A64F; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      selectionMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: pinIcon,
        draggable: Boolean(onLocationSelect),
      }).addTo(mapInstanceRef.current);

      if (onLocationSelect) {
        selectionMarkerRef.current.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng();
          handleLocationUpdate(lat, lng, 'MAP_PIN');
        });
      }

      mapInstanceRef.current.setView([selectedLocation.lat, selectedLocation.lng], Math.max(mapInstanceRef.current.getZoom(), 14));
    }
  }, [selectedLocation, onLocationSelect, handleLocationUpdate]);

  // Render complaint markers and hotspot circles
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    if (hotspotsLayerRef.current) hotspotsLayerRef.current.clearLayers();

    // Render recurring hotspot circles
    if (showHotspots && hotspotsLayerRef.current && hotspots && hotspots.length > 0) {
      hotspots.forEach((h) => {
        if (h.latitude != null && h.longitude != null) {
          const circle = L.circle([h.latitude, h.longitude], {
            color: '#C65B5B',
            fillColor: '#C65B5B',
            fillOpacity: 0.18,
            radius: 350, // 350m recurring cluster radius
            weight: 1.5,
          });

          const hotspotPopup = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 260px; font-size: 11px; line-height: 1.4; color: #253746;">
              <div style="font-weight: 800; color: #C65B5B; margin-bottom: 2px;">⚠️ RECURRING CIVIC HOTSPOT</div>
              <div style="font-weight: 700; color: #193B50; font-size: 12px;">${h.categoryName} Cluster</div>
              <div style="color: #64748B; margin-top: 2px;">📍 ${h.approximateArea || 'Municipal Area'} (${h.totalComplaints} clustered reports)</div>
              <div style="margin-top: 4px; padding: 4px 6px; background: #F4F7F8; border-radius: 4px; font-size: 10px; color: #193B50; font-weight: 600;">
                Action: ${h.recommendedAction}
              </div>
            </div>
          `;
          circle.bindPopup(hotspotPopup);
          circle.addTo(hotspotsLayerRef.current);
        }
      });
    }

    if (complaints && complaints.length > 0) {
      complaints.forEach((c) => {
        if (c.latitude != null && c.longitude != null) {
          const marker = L.marker([c.latitude, c.longitude], {
            icon: getMarkerIcon(c.status, c.priority, c.category_name),
          });

          const popupContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 260px; font-size: 12px; line-height: 1.4; color: #253746;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-family: monospace; font-weight: 700; font-size: 11px; background: #F4F7F8; padding: 2px 6px; border-radius: 4px; border: 1px solid #DCE5E9; color: #193B50;">
                  ${c.complaint_code || 'ID'}
                </span>
                <span style="font-size: 10px; font-weight: 700; color: #64748B;">${c.category_name || 'Civic'}</span>
              </div>
              <div style="font-weight: 700; color: #193B50; margin-bottom: 3px; font-size: 12px;">${c.title}</div>
              <div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">📍 ${c.address || c.district || ''} ${c.district ? `(${c.district}, ${c.state || ''})` : ''}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #DCE5E9; padding-top: 5px; font-size: 11px;">
                <span style="font-weight: 600; color: #287C78;">Status: ${c.status ? c.status.replace('_', ' ') : ''}</span>
                <span style="color: #64748B;">👍 ${c.support_count || 0}</span>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);

          if (onSelectComplaint) {
            marker.on('click', () => onSelectComplaint(c));
          }

          marker.addTo(markersLayerRef.current);
        }
      });
    }
  }, [complaints, hotspots, showHotspots, onSelectComplaint]);

  // Handle GPS location request from user's device
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your current browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        const { latitude, longitude } = position.coords;
        if (!isValidIndiaCoordinate(latitude, longitude)) {
          setGpsError('Detected coordinates fall outside India.');
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
        }
        handleLocationUpdate(latitude, longitude, 'GPS');
      },
      (error) => {
        setGpsLoading(false);
        let msg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can search or click directly on the map to pin your location.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable from your device.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try searching or pinning manually.';
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Debounced search location handler
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.trim().length >= 3) {
      setIsSearching(true);
      searchLocation(val)
        .then((results) => {
          setSearchResults(results);
          setIsSearching(false);
        })
        .catch(() => {
          setIsSearching(false);
        });
    } else {
      setSearchResults([]);
    }
  };

  // Select place from autocomplete
  const handleSelectPlace = (place) => {
    setSearchQuery(place.displayName.split(',')[0]);
    setSearchResults([]);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([place.lat, place.lng], 15);
    }

    handleLocationUpdate(place.lat, place.lng, 'SEARCH');
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#DCE5E9] shadow-xs">
      {/* Top Search & GPS Control Toolbar */}
      {onLocationSelect && (enableSearch || enableGps) && (
        <div className="absolute top-3 left-3 right-3 z-1000 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Autocomplete Search Input */}
          {enableSearch && (
            <div className="relative flex-1">
              <div className="flex items-center bg-white/95 backdrop-blur-xs border border-[#DCE5E9] rounded-lg shadow-md px-3 py-1.5 focus-within:border-[#193B50]">
                <Search className="w-4 h-4 text-[#64748B] shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search city, town, locality or landmark across India..."
                  className="w-full text-xs text-[#253746] bg-transparent outline-none placeholder:text-[#64748B]"
                />
                {isSearching && <Loader2 className="w-3.5 h-3.5 text-[#287C78] animate-spin shrink-0 ml-1" />}
              </div>

              {/* Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#DCE5E9] rounded-lg shadow-xl max-h-48 overflow-y-auto z-1010 divide-y divide-[#DCE5E9]/60">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectPlace(item)}
                      className="p-2 hover:bg-[#F4F7F8] cursor-pointer text-left text-xs transition-colors"
                    >
                      <p className="font-semibold text-[#193B50] truncate">{item.displayName.split(',')[0]}</p>
                      <p className="text-[11px] text-[#64748B] truncate">{item.displayName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick GPS Geolocation Button */}
          {enableGps && (
            <button
              type="button"
              onClick={handleGetGpsLocation}
              disabled={gpsLoading}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#193B50] hover:bg-[#122B3B] text-white text-xs font-semibold rounded-lg shadow-md transition-all shrink-0"
              title="Detect device GPS location"
            >
              {gpsLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D6A64F]" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-[#D6A64F]" />
                  <span>Use My GPS</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* GPS Error Notification */}
      {gpsError && (
        <div className="absolute top-16 left-3 right-3 z-1000 bg-red-50/95 border border-red-200 text-[#C65B5B] px-3 py-2 rounded-lg text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsError('')}
            className="text-xs font-bold hover:underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Map Element Container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Interactive Helper Banner at Bottom */}
      {onLocationSelect && (
        <div className="absolute bottom-3 left-3 right-3 z-1000 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-lg text-xs font-medium text-[#193B50] shadow-md border border-[#DCE5E9] flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-4 h-4 text-[#287C78] shrink-0" />
            <span className="truncate">
              {reverseGeocoding
                ? 'Resolving address via OpenStreetMap...'
                : selectedLocation
                ? `Pinned: ${selectedLocation.lat}, ${selectedLocation.lng}`
                : 'Click or drag marker anywhere in India to set exact issue coordinates'}
            </span>
          </div>
          {reverseGeocoding && <Loader2 className="w-3.5 h-3.5 text-[#287C78] animate-spin shrink-0 ml-2" />}
        </div>
      )}
    </div>
  );
}
