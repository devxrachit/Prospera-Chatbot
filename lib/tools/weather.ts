import { tool } from 'ai';
import { z } from 'zod';

// WMO Weather interpretation codes → human-readable
const WMO: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain (light)',
  67: 'Freezing rain (heavy)',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Heavy showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * Uses Open-Meteo (https://open-meteo.com) — completely free, no API key.
 */
export const weatherTool = tool({
  description:
    'Get current weather conditions for any city or location. Returns temperature, humidity, wind speed, and a human-readable condition. Data from Open-Meteo (no API key required).',
  parameters: z.object({
    location: z
      .string()
      .describe('City name or location (e.g. "London", "Tokyo", "New York, US")'),
  }),
  execute: async ({ location }) => {
    // Step 1: Geocode the location
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!geoRes.ok) return { error: 'Geocoding service unavailable' };

    const geoData = (await geoRes.json()) as {
      results?: Array<{
        latitude: number;
        longitude: number;
        name: string;
        country: string;
        admin1?: string;
        timezone: string;
      }>;
    };

    if (!geoData.results?.length) {
      return { error: `Location "${location}" not found. Try a major city name.` };
    }

    const { latitude, longitude, name, country, admin1, timezone } = geoData.results[0];

    // Step 2: Fetch weather
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation',
        'wind_speed_10m',
        'wind_direction_10m',
        'weather_code',
        'cloud_cover',
        'is_day',
      ].join(','),
      hourly: 'temperature_2m',
      forecast_days: '1',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      timezone: timezone ?? 'auto',
    });

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!weatherRes.ok) return { error: 'Weather service unavailable' };

    const w = (await weatherRes.json()) as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        precipitation: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
        weather_code: number;
        cloud_cover: number;
        is_day: number;
      };
    };

    const c = w.current;
    const displayName = admin1 ? `${name}, ${admin1}, ${country}` : `${name}, ${country}`;

    return {
      location: displayName,
      coordinates: { latitude, longitude },
      current: {
        temperature: `${Math.round(c.temperature_2m)}°C`,
        feelsLike: `${Math.round(c.apparent_temperature)}°C`,
        humidity: `${c.relative_humidity_2m}%`,
        precipitation: `${c.precipitation} mm`,
        windSpeed: `${Math.round(c.wind_speed_10m)} km/h`,
        windDirection: compassDirection(c.wind_direction_10m),
        cloudCover: `${c.cloud_cover}%`,
        condition: WMO[c.weather_code] ?? `Code ${c.weather_code}`,
        isDay: c.is_day === 1,
      },
    };
  },
});

function compassDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}
