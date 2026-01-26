/**
 * Geocoding utilities using Nominatim (OpenStreetMap)
 */

interface GeocodingResult {
    lat: number;
    lng: number;
    display_name: string;
}

/**
 * Geocode an address to lat/lng coordinates
 * @param address - Full address string
 * @param city - City name (optional, helps with accuracy)
 * @returns Promise with coordinates or null if not found
 */
export async function geocodeAddress(
    address: string,
    city?: string
): Promise<GeocodingResult | null> {
    try {
        // Build query string - combine city and address for better results
        const query = city ? `${address}, ${city}, Israel` : `${address}, Israel`;

        // Use Nominatim API (OpenStreetMap's geocoding service)
        // Note: Be respectful of their usage policy - max 1 request per second
        const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'il', // Restrict to Israel
            addressdetails: '1'
        });

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'JuhuriHeritage/1.0' // Required by Nominatim
            }
        });

        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }

        const results = await response.json();

        if (results && results.length > 0) {
            const result = results[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                display_name: result.display_name
            };
        }

        return null;
    } catch (err) {
        console.error('Geocoding error:', err);
        return null;
    }
}

/**
 * Reverse geocode coordinates to an address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise with address or null if not found
 */
export async function reverseGeocode(
    lat: number,
    lng: number
): Promise<string | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?` + new URLSearchParams({
            lat: lat.toString(),
            lon: lng.toString(),
            format: 'json',
            addressdetails: '1'
        });

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'JuhuriHeritage/1.0'
            }
        });

        if (!response.ok) {
            throw new Error('Reverse geocoding request failed');
        }

        const result = await response.json();

        if (result && result.display_name) {
            return result.display_name;
        }

        return null;
    } catch (err) {
        console.error('Reverse geocoding error:', err);
        return null;
    }
}

/**
 * Debounced geocoding for use in forms
 * Waits for user to stop typing before geocoding
 */
export function createGeocodingDebouncer(delay: number = 1000) {
    let timeoutId: NodeJS.Timeout | null = null;

    return function debounce(
        address: string,
        city: string | undefined,
        callback: (result: GeocodingResult | null) => void
    ) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(async () => {
            const result = await geocodeAddress(address, city);
            callback(result);
        }, delay);
    };
}
