import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Cloud,
  Sun,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  CloudFog,
  Wind,
  Droplets,
  RefreshCw,
  MapPin,
  ChevronDown,
  ExternalLink,
  Compass,
  LocateFixed,
  Umbrella,
  Thermometer,
} from 'lucide-react';
import { useEventFilter } from '../contexts/EventFilterContext';
import { SLOVENIA_REGIONS } from '../services/categoryService';

export interface SlovenianCityWeatherConfig {
  name: string;
  region: string;
  lat: number;
  lon: number;
}

export const SLOVENIAN_WEATHER_CITIES: SlovenianCityWeatherConfig[] = [
  { name: 'Ljubljana', region: 'Osrednjeslovenska', lat: 46.0569, lon: 14.5058 },
  { name: 'Maribor', region: 'Podravska', lat: 46.5547, lon: 15.6459 },
  { name: 'Celje', region: 'Savinjska', lat: 46.2360, lon: 15.2677 },
  { name: 'Kranj', region: 'Gorenjska', lat: 46.2389, lon: 14.3556 },
  { name: 'Koper', region: 'Obalno-kraška', lat: 45.5481, lon: 13.7302 },
  { name: 'Novo Mesto', region: 'Jugovzhodna', lat: 45.8039, lon: 15.1689 },
  { name: 'Nova Gorica', region: 'Goriška', lat: 45.9553, lon: 13.6493 },
  { name: 'Murska Sobota', region: 'Pomurska', lat: 46.6625, lon: 16.1664 },
  { name: 'Velenje', region: 'Savinjska', lat: 46.3625, lon: 15.1144 },
  { name: 'Ptuj', region: 'Podravska', lat: 46.4200, lon: 15.8700 },
  { name: 'Bled', region: 'Gorenjska', lat: 46.3683, lon: 14.1146 },
  { name: 'Portorož', region: 'Obalno-kraška', lat: 45.5143, lon: 13.5921 },
];

export interface ForecastDay {
  date: string;
  dayLabel: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipProb?: number;
}

export interface WeatherLocationState {
  mode: 'auto' | 'manual';
  name: string;
  region?: string;
  lat: number;
  lon: number;
  detectedVia?: 'gps' | 'ip' | 'manual' | 'default';
}

export interface WeatherWidgetData {
  city: string;
  currentTemp: number;
  apparentTemp: number;
  humidity: number;
  windSpeed: number;
  precipProbToday: number;
  weatherCode: number;
  forecast: ForecastDay[];
  updatedAt: string;
  source: string;
}

export interface WeatherWidgetProps {
  variant?: 'default' | 'events';
}

const LOCATION_STORAGE_KEY = 'portalko_weather_location_v2';
const WEATHER_CACHE_PREFIX = 'portalko_weather_v2_';

// Map WMO codes to Slovenian descriptions & Lucide icons
export function getWeatherInfo(code: number): { description: string; icon: React.ReactNode; colorClass: string } {
  if (code === 0) {
    return {
      description: 'Jasno in sončno',
      icon: <Sun className="w-5 h-5 text-amber-500" />,
      colorClass: 'text-amber-500',
    };
  }
  if (code === 1) {
    return {
      description: 'Pretežno jasno',
      icon: <CloudSun className="w-5 h-5 text-amber-400" />,
      colorClass: 'text-amber-500',
    };
  }
  if (code === 2) {
    return {
      description: 'Delno oblačno',
      icon: <CloudSun className="w-5 h-5 text-sky-500" />,
      colorClass: 'text-sky-500',
    };
  }
  if (code === 3) {
    return {
      description: 'Pretežno oblačno',
      icon: <Cloud className="w-5 h-5 text-slate-400" />,
      colorClass: 'text-slate-400',
    };
  }
  if (code === 45 || code === 48) {
    return {
      description: 'Megla',
      icon: <CloudFog className="w-5 h-5 text-slate-400" />,
      colorClass: 'text-slate-400',
    };
  }
  if (code >= 51 && code <= 57) {
    return {
      description: 'Rahlo rosenje',
      icon: <CloudDrizzle className="w-5 h-5 text-blue-400" />,
      colorClass: 'text-blue-400',
    };
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      description: 'Dež / Plohe',
      icon: <CloudRain className="w-5 h-5 text-blue-500" />,
      colorClass: 'text-blue-500',
    };
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return {
      description: 'Sneženje',
      icon: <Snowflake className="w-5 h-5 text-cyan-400" />,
      colorClass: 'text-cyan-400',
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      description: 'Nevihta z grmenjem',
      icon: <CloudLightning className="w-5 h-5 text-amber-600" />,
      colorClass: 'text-amber-600',
    };
  }
  return {
    description: 'Zmerno oblačno',
    icon: <Cloud className="w-5 h-5 text-slate-400" />,
    colorClass: 'text-slate-400',
  };
}

function getSlovenianDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Danes';
  if (index === 1) return 'Jutri';
  try {
    const d = new Date(dateStr);
    const days = ['Ned', 'Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob'];
    return days[d.getDay()];
  } catch {
    return `Dan ${index + 1}`;
  }
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestSlovenianCity(lat: number, lon: number): SlovenianCityWeatherConfig {
  let nearest = SLOVENIAN_WEATHER_CITIES[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const city of SLOVENIAN_WEATHER_CITIES) {
    const dist = haversineDistanceKm(lat, lon, city.lat, city.lon);
    if (dist < bestDist) {
      bestDist = dist;
      nearest = city;
    }
  }
  return nearest;
}

async function reverseGeocodeCoordinates(
  lat: number,
  lon: number
): Promise<{ name: string; region?: string }> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lon)}&localityLanguage=sl`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const city =
        data.city ||
        data.locality ||
        data.principalSubdivision ||
        '';
      if (city && typeof city === 'string') {
        return {
          name: city.trim(),
          region: typeof data.principalSubdivision === 'string' ? data.principalSubdivision : undefined,
        };
      }
    }
  } catch {
    // fallback to nearest Slovenian city
  }

  const nearest = findNearestSlovenianCity(lat, lon);
  return { name: nearest.name, region: nearest.region };
}

function getOutdoorEventTip(data: WeatherWidgetData): { text: string; tone: 'good' | 'rain' | 'cold' | 'wind' } {
  const code = data.weatherCode;
  if (code >= 95) {
    return {
      text: 'Možnost neviht: spremljajte obvestila organizatorjev glede dogodkov na prostem.',
      tone: 'rain',
    };
  }
  if ((code >= 51 && code <= 86) || data.precipProbToday >= 55) {
    return {
      text: 'Višja možnost padavin – za dogodke na prostem priporočamo dežnik ali pelerino.',
      tone: 'rain',
    };
  }
  if (data.windSpeed >= 30) {
    return {
      text: 'Piha močnejši veter – upoštevajte zaščito pred vetrom na prizoriščih na prostem.',
      tone: 'wind',
    };
  }
  if (data.currentTemp <= 7) {
    return {
      text: 'Sveže vreme – za večerne prireditve na prostem priporočamo topla oblačila.',
      tone: 'cold',
    };
  }
  return {
    text: 'Ugodne vremenske razmere za obisk koncertov, festivalov in prireditev na prostem.',
    tone: 'good',
  };
}

function generateFallbackWeather(locationName: string): WeatherWidgetData {
  const baseTemps: Record<string, { temp: number; max: number; min: number; code: number; humidity: number; wind: number; precip: number }> = {
    'Ljubljana': { temp: 12, max: 15, min: 6, code: 2, humidity: 68, wind: 8, precip: 15 },
    'Maribor': { temp: 13, max: 16, min: 5, code: 1, humidity: 62, wind: 9, precip: 10 },
    'Celje': { temp: 12, max: 15, min: 5, code: 2, humidity: 70, wind: 7, precip: 15 },
    'Kranj': { temp: 11, max: 14, min: 4, code: 3, humidity: 72, wind: 7, precip: 20 },
    'Koper': { temp: 16, max: 18, min: 10, code: 0, humidity: 60, wind: 14, precip: 5 },
    'Novo Mesto': { temp: 13, max: 16, min: 6, code: 1, humidity: 66, wind: 6, precip: 10 },
    'Nova Gorica': { temp: 15, max: 18, min: 9, code: 1, humidity: 62, wind: 8, precip: 10 },
    'Murska Sobota': { temp: 13, max: 15, min: 5, code: 2, humidity: 65, wind: 10, precip: 15 },
    'Velenje': { temp: 11, max: 14, min: 4, code: 2, humidity: 69, wind: 7, precip: 20 },
    'Ptuj': { temp: 13, max: 16, min: 5, code: 1, humidity: 63, wind: 8, precip: 10 },
    'Bled': { temp: 10, max: 14, min: 3, code: 2, humidity: 73, wind: 6, precip: 20 },
    'Portorož': { temp: 17, max: 19, min: 11, code: 0, humidity: 58, wind: 13, precip: 5 },
  };

  const current = baseTemps[locationName] || { temp: 13, max: 16, min: 6, code: 1, humidity: 65, wind: 8, precip: 15 };
  const today = new Date();

  const forecast: ForecastDay[] = [0, 1, 2, 3].map((offset) => {
    const dt = new Date(today.getTime() + offset * 86400000);
    const dStr = dt.toISOString().split('T')[0];
    return {
      date: dStr,
      dayLabel: getSlovenianDayLabel(dStr, offset),
      weatherCode: offset === 0 ? current.code : (current.code + offset) % 4,
      tempMax: current.max + (offset % 2 === 0 ? 0 : 1),
      tempMin: current.min + (offset > 1 ? 1 : 0),
      precipProb: current.precip,
    };
  });

  return {
    city: locationName,
    currentTemp: current.temp,
    apparentTemp: current.temp,
    humidity: current.humidity,
    windSpeed: current.wind,
    precipProbToday: current.precip,
    weatherCode: current.code,
    forecast,
    updatedAt: new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }),
    source: 'ARSO / Open-Meteo',
  };
}

export function WeatherWidget({ variant = 'default' }: WeatherWidgetProps) {
  const { locationFilter, selectedRegion } = useEventFilter();

  const [locationState, setLocationState] = useState<WeatherLocationState>(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number' && parsed.name) {
          return parsed;
        }
      }
      const legacyCityName = localStorage.getItem('portalko_weather_city');
      if (legacyCityName) {
        const matched = SLOVENIAN_WEATHER_CITIES.find(c => c.name === legacyCityName);
        if (matched) {
          return {
            mode: 'manual',
            name: matched.name,
            region: matched.region,
            lat: matched.lat,
            lon: matched.lon,
            detectedVia: 'manual',
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    const def = SLOVENIAN_WEATHER_CITIES[0];
    return {
      mode: 'auto',
      name: def.name,
      region: def.region,
      lat: def.lat,
      lon: def.lon,
      detectedVia: 'default',
    };
  });

  const [weatherData, setWeatherData] = useState<WeatherWidgetData>(() => {
    try {
      const cacheKey = `${WEATHER_CACHE_PREFIX}${locationState.lat.toFixed(2)}_${locationState.lon.toFixed(2)}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.forecast) && parsed.forecast.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return generateFallbackWeather(locationState.name);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatusMsg, setLocationStatusMsg] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasAutoLocatedRef = useRef(false);

  const persistLocationState = useCallback((next: WeatherLocationState) => {
    setLocationState(next);
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem('portalko_weather_city', next.name);
    } catch {
      // ignore
    }
  }, []);

  const fetchLiveWeather = useCallback(async (loc: WeatherLocationState) => {
    setIsLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=4`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6500) });
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();

      if (data && data.current) {
        const days = data.daily?.time || [];
        const forecast: ForecastDay[] = days.slice(0, 4).map((dStr: string, idx: number) => ({
          date: dStr,
          dayLabel: getSlovenianDayLabel(dStr, idx),
          weatherCode: data.daily.weather_code?.[idx] ?? 0,
          tempMax: Math.round(data.daily.temperature_2m_max?.[idx] ?? 16),
          tempMin: Math.round(data.daily.temperature_2m_min?.[idx] ?? 7),
          precipProb:
            typeof data.daily.precipitation_probability_max?.[idx] === 'number'
              ? Math.round(data.daily.precipitation_probability_max[idx])
              : undefined,
        }));

        const fresh: WeatherWidgetData = {
          city: loc.name,
          currentTemp: Math.round(data.current.temperature_2m),
          apparentTemp: Math.round(data.current.apparent_temperature ?? data.current.temperature_2m),
          humidity: Math.round(data.current.relative_humidity_2m),
          windSpeed: Math.round(data.current.wind_speed_10m),
          precipProbToday: forecast[0]?.precipProb ?? 0,
          weatherCode: data.current.weather_code,
          forecast,
          updatedAt: new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }),
          source: 'Open-Meteo / ARSO',
        };

        setWeatherData(fresh);
        try {
          const cacheKey = `${WEATHER_CACHE_PREFIX}${loc.lat.toFixed(2)}_${loc.lon.toFixed(2)}`;
          localStorage.setItem(cacheKey, JSON.stringify(fresh));
        } catch {
          // ignore
        }
      }
    } catch {
      setWeatherData((prev) =>
        prev && Array.isArray(prev.forecast) && prev.city === loc.name
          ? prev
          : generateFallbackWeather(loc.name)
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const detectUserLocation = useCallback(
    async (explicitTrigger = false) => {
      setIsLocating(true);
      if (explicitTrigger) {
        setLocationStatusMsg(null);
      }

      const tryIpFallback = async () => {
        try {
          const ipRes = await fetch('/api/weather/ip-location', { signal: AbortSignal.timeout(4000) });
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData?.ok && typeof ipData.lat === 'number' && typeof ipData.lon === 'number') {
              const resolvedName =
                ipData.city || findNearestSlovenianCity(ipData.lat, ipData.lon).name;
              persistLocationState({
                mode: 'auto',
                name: resolvedName,
                region: ipData.region || undefined,
                lat: ipData.lat,
                lon: ipData.lon,
                detectedVia: 'ip',
              });
              setLocationStatusMsg(null);
              return true;
            }
          }
        } catch {
          // ignore IP lookup error
        }
        return false;
      };

      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 7000,
              maximumAge: 10 * 60 * 1000,
            });
          });

          const lat = Number(position.coords.latitude.toFixed(4));
          const lon = Number(position.coords.longitude.toFixed(4));
          const geoInfo = await reverseGeocodeCoordinates(lat, lon);

          persistLocationState({
            mode: 'auto',
            name: geoInfo.name,
            region: geoInfo.region,
            lat,
            lon,
            detectedVia: 'gps',
          });
          setLocationStatusMsg(null);
          setIsLocating(false);
          return;
        } catch {
          // Permission denied or blocked in iframe; attempt IP fallback
          const resolvedViaIp = await tryIpFallback();
          if (!resolvedViaIp && explicitTrigger) {
            setLocationStatusMsg('Dostop do lokacije ni omogočen – prikazujemo izbrani kraj.');
          }
          setIsLocating(false);
          return;
        }
      } else {
        await tryIpFallback();
        if (explicitTrigger) {
          setLocationStatusMsg('Brskalnik ne podpira geolokacije – prikazujemo izbrani kraj.');
        }
        setIsLocating(false);
      }
    },
    [persistLocationState]
  );

  // On mount: if mode is 'auto', detect current user location automatically once
  useEffect(() => {
    if (locationState.mode === 'auto' && !hasAutoLocatedRef.current) {
      hasAutoLocatedRef.current = true;
      void detectUserLocation(false);
    }
  }, [locationState.mode, detectUserLocation]);

  // Fetch weather whenever active coordinates change
  useEffect(() => {
    void fetchLiveWeather(locationState);
  }, [locationState, fetchLiveWeather]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleSelectCity = (city: SlovenianCityWeatherConfig) => {
    setIsDropdownOpen(false);
    setLocationStatusMsg(null);
    persistLocationState({
      mode: 'manual',
      name: city.name,
      region: city.region,
      lat: city.lat,
      lon: city.lon,
      detectedVia: 'manual',
    });
  };

  // Optional quick match if user filtered events by a specific Slovenian city/region in Events section
  const activeEventCityMatch = useMemo(() => {
    if (variant !== 'events') return null;
    const targetText = (
      locationFilter ||
      (selectedRegion && selectedRegion !== 'all'
        ? selectedRegion.startsWith('city-')
          ? selectedRegion.replace('city-', '')
          : SLOVENIA_REGIONS.find((r) => r.id === selectedRegion)?.cities?.[0] || ''
        : '')
    )
      .trim()
      .toLowerCase();

    if (!targetText) return null;
    const matched = SLOVENIAN_WEATHER_CITIES.find(
      (c) =>
        targetText.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(targetText)
    );
    if (!matched || matched.name.toLowerCase() === locationState.name.toLowerCase()) {
      return null;
    }
    return matched;
  }, [variant, locationFilter, selectedRegion, locationState.name]);

  const weatherInfo = getWeatherInfo(weatherData?.weatherCode ?? 1);
  const safeForecast =
    weatherData && Array.isArray(weatherData.forecast) && weatherData.forecast.length > 0
      ? weatherData.forecast
      : generateFallbackWeather(locationState.name).forecast;

  const eventTip = useMemo(() => getOutdoorEventTip(weatherData), [weatherData]);

  const locationBadgeText =
    locationState.detectedVia === 'gps'
      ? 'Vaša lokacija'
      : locationState.detectedVia === 'ip'
      ? 'Približna lokacija'
      : 'Izbrana lokacija';

  return (
    <section
      aria-label="Lokalna vremenska napoved"
      className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container/60 flex flex-col gap-3 relative transition-all duration-200"
    >
      {/* Header Row: Location Dropdown, Locate Me & Refresh */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-low gap-2 relative z-20">
        <div className="relative min-w-0 flex-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-xl hover:bg-surface-container-low text-on-surface font-headline-sm text-sm font-bold transition-all cursor-pointer max-w-full"
            title="Izberite kraj ali uporabite svojo trenutno lokacijo"
          >
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{locationState.name}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-outline shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div className="text-[10px] text-outline pl-4 leading-tight truncate">
            {locationBadgeText}
            {locationState.region ? ` · ${locationState.region}` : ''}
          </div>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  void detectUserLocation(true);
                }}
                className="w-full px-3 py-2 text-left text-xs font-bold text-primary hover:bg-primary/5 flex items-center gap-2 border-b border-surface-container-low cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5 shrink-0" />
                <span>Uporabi mojo trenutno lokacijo</span>
              </button>
              <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-outline uppercase border-b border-surface-container-low">
                Slovenski kraji
              </div>
              {SLOVENIAN_WEATHER_CITIES.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelectCity(c)}
                  className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer ${
                    c.name === locationState.name && locationState.mode === 'manual'
                      ? 'text-primary font-bold bg-primary/5'
                      : 'text-on-surface'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="text-[10px] text-outline truncate max-w-[90px]">{c.region}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GPS Locate, Time & Refresh Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => void detectUserLocation(true)}
            disabled={isLocating}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
              locationState.detectedVia === 'gps'
                ? 'text-primary bg-primary/10 hover:bg-primary/15'
                : 'text-outline hover:text-primary hover:bg-surface-container-low'
            }`}
            title="Zaznaj mojo trenutno lokacijo"
            aria-label="Zaznaj mojo trenutno lokacijo"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'opacity-70 text-primary' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => void fetchLiveWeather(locationState)}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-surface-container-low text-outline hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            title="Osveži vremensko napoved"
            aria-label="Osveži vremensko napoved"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {locationStatusMsg && (
        <div className="text-[11px] text-outline bg-surface-container-low/70 rounded-lg px-2.5 py-1.5 leading-snug">
          {locationStatusMsg}
        </div>
      )}

      {activeEventCityMatch && (
        <button
          type="button"
          onClick={() => handleSelectCity(activeEventCityMatch)}
          className="text-left text-[11px] font-semibold text-primary bg-primary/8 hover:bg-primary/14 border border-primary/20 rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer flex items-center justify-between gap-2"
        >
          <span>Prikaži vreme za prizorišče: {activeEventCityMatch.name}</span>
          <span aria-hidden="true">→</span>
        </button>
      )}

      {/* Current Temperature & Conditions */}
      <div className="flex items-center justify-between gap-2.5 pt-0.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container/60 shrink-0">
            {weatherInfo.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <span className="font-headline-lg text-2xl sm:text-3xl font-black text-on-surface tracking-tight tabular-nums">
                {weatherData.currentTemp}°
              </span>
              <span className="text-xs text-outline font-semibold">C</span>
            </div>
            <p
              className="font-label-md text-xs font-semibold text-on-surface-variant leading-tight truncate"
              title={weatherInfo.description}
            >
              {weatherInfo.description}
            </p>
            <p className="text-[11px] text-outline tabular-nums mt-0.5 flex items-center gap-1">
              <Thermometer className="w-3 h-3 shrink-0" />
              <span>Občutek {weatherData.apparentTemp}°C</span>
            </p>
          </div>
        </div>

        {/* Precipitation, Humidity & Wind metrics */}
        <div className="flex flex-col gap-1 text-[11px] text-on-surface-variant font-medium text-right shrink-0 pl-2.5 border-l border-surface-container-low tabular-nums">
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap" title="Verjetnost padavin danes">
            <Umbrella className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{weatherData.precipProbToday}% padavin</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap" title="Zračna vlaga">
            <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>{weatherData.humidity}% vlaga</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap" title="Hitrost vetra">
            <Wind className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span>{weatherData.windSpeed} km/h</span>
          </div>
        </div>
      </div>

      {/* Outdoor Event Visitor Advisory */}
      {variant === 'events' && (
        <div
          className={`rounded-xl px-3 py-2 border text-[11px] leading-snug ${
            eventTip.tone === 'rain'
              ? 'bg-sky-500/8 border-sky-500/20 text-on-surface-variant'
              : eventTip.tone === 'wind' || eventTip.tone === 'cold'
              ? 'bg-amber-500/8 border-amber-500/20 text-on-surface-variant'
              : 'bg-secondary/8 border-secondary/20 text-on-surface-variant'
          }`}
        >
          <span className="font-bold text-on-surface">Za obisk dogodkov: </span>
          <span>{eventTip.text}</span>
        </div>
      )}

      {/* 4-Day Local Forecast */}
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-surface-container-low">
        {safeForecast.map((fc, i) => {
          const info = getWeatherInfo(fc.weatherCode);
          return (
            <div
              key={fc.date || i}
              className={`flex flex-col items-center justify-between p-1.5 rounded-xl border text-center gap-1 min-w-0 ${
                i === 0
                  ? 'bg-primary/6 border-primary/20'
                  : 'bg-surface-container-low/60 border-surface-container/40'
              }`}
            >
              <span className={`text-[10px] font-bold truncate w-full ${i === 0 ? 'text-primary' : 'text-on-surface'}`}>
                {fc.dayLabel}
              </span>
              <div className="scale-90">{info.icon}</div>
              <div className="flex items-center justify-center gap-0.5 text-[10px] tabular-nums">
                <span className="font-bold text-on-surface">{fc.tempMax}°</span>
                <span className="text-outline text-[9px]">{fc.tempMin}°</span>
              </div>
              {typeof fc.precipProb === 'number' && (
                <span className="text-[9px] text-sky-600 dark:text-sky-400 font-semibold tabular-nums leading-none">
                  {fc.precipProb}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer attribution */}
      <div className="flex items-center justify-between text-[10px] text-outline pt-1">
        <span className="flex items-center gap-1 tabular-nums">
          <Compass className="w-3 h-3 text-outline/70" />
          <span>Posodobljeno {weatherData.updatedAt}</span>
        </span>
        <a
          href="https://meteo.arso.gov.si"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-0.5 font-medium"
          title="Uradni vremenski podatki ARSO Vreme Slovenija"
        >
          <span>ARSO vreme</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </section>
  );
}

export default WeatherWidget;
