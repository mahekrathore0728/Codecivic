/**
 * CodeCivic Geocoding & Reverse-Geocoding Utility
 * Uses OpenStreetMap Nominatim with respectful rate limiting and User-Agent headers
 * Handles coordinates validation and structured address extraction for Indian locations
 */

import { getAllStates, INDIA_GEO_DATA } from './indiaGeoData';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const NOMINATIM_HEADERS = {
  'Accept': 'application/json',
  // Required by OpenStreetMap Nominatim usage policy
  'User-Agent': 'CodeCivic-CivicTech-App/2.0 (citizen-portal@codecivic.gov.in)',
};

/**
 * Validates if coordinates fall within Indian geographic boundaries
 * (Latitude 6°N - 38°N, Longitude 68°E - 98°E)
 */
export function isValidIndiaCoordinate(lat, lng) {
  if (lat == null || lng == null) return false;
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
  return numLat >= 6.0 && numLat <= 38.0 && numLng >= 68.0 && numLng <= 98.0;
}

/**
 * Normalizes state name to match official list in INDIA_GEO_DATA
 */
export function matchOfficialState(rawState) {
  if (!rawState) return '';
  const cleaned = rawState.trim().toLowerCase();
  const all = getAllStates();
  const exact = all.find((s) => s.toLowerCase() === cleaned);
  if (exact) return exact;
  const partial = all.find((s) => s.toLowerCase().includes(cleaned) || cleaned.includes(s.toLowerCase()));
  return partial || rawState;
}

/**
 * Reverse-geocodes latitude and longitude into structured Indian address fields
 */
export async function reverseGeocode(lat, lng) {
  if (!isValidIndiaCoordinate(lat, lng)) {
    return {
      success: false,
      error: 'Coordinates appear outside India geographic bounds.',
    };
  }

  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const response = await fetch(url, { headers: NOMINATIM_HEADERS });

    if (!response.ok) {
      throw new Error(`Reverse geocode request failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};

    // Locality: suburb, neighbourhood, residential, subdistrict, or village
    const locality =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.subdistrict ||
      addr.village ||
      addr.quarter ||
      '';

    // City: city, town, municipality, or county
    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.county ||
      '';

    // District: state_district, county, or city
    const rawDistrict =
      addr.state_district ||
      addr.county ||
      addr.city ||
      '';
    // Clean district string (e.g. "Kota District" -> "Kota")
    const district = rawDistrict.replace(/\s+district$/i, '').trim();

    // State: state
    const state = matchOfficialState(addr.state || '');

    // Pincode: postcode
    const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';

    // Landmark: amenity, building, road, public_building
    const landmark = addr.amenity || addr.building || addr.tourism || '';

    // Formatted street address
    const streetComponents = [
      addr.road || addr.pedestrian || addr.street,
      locality,
      landmark,
    ].filter(Boolean);

    const formattedAddress = streetComponents.length > 0
      ? streetComponents.join(', ')
      : data.display_name.split(',').slice(0, 3).join(', ').trim();

    return {
      success: true,
      address: formattedAddress,
      locality,
      landmark,
      city,
      district,
      state,
      pincode,
      fullDisplayName: data.display_name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    };
  } catch (err) {
    console.warn('Reverse geocoding error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Searches for places and addresses in India with autocomplete suggestions
 */
export async function searchLocation(query) {
  if (!query || query.trim().length < 3) return [];

  try {
    const url = `${NOMINATIM_BASE_URL}/search?format=jsonv2&q=${encodeURIComponent(
      query.trim()
    )}&countrycodes=in&limit=5&addressdetails=1`;

    const response = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!response.ok) return [];

    const results = await response.json();
    return results.map((item) => {
      const addr = item.address || {};
      const state = matchOfficialState(addr.state || '');
      const district = (addr.state_district || addr.county || addr.city || '').replace(/\s+district$/i, '').trim();
      const city = addr.city || addr.town || addr.municipality || '';
      const locality = addr.suburb || addr.neighbourhood || addr.residential || '';
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';

      return {
        id: item.place_id,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        state,
        district,
        city,
        locality,
        pincode,
      };
    });
  } catch (err) {
    console.warn('Location search error:', err.message);
    return [];
  }
}
