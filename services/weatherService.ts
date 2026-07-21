
export interface DailyForecast {
  time: string;
  tempMax: number;
  tempMin: number;
  rainSum: number;
  rainChance: number;
  conditionCode: number;
  conditionText: string;
  uvIndexMax: number;
  et0: number;          // Evapotranspiration mm/day
  sunrise: string;      // ISO time string
  sunset: string;       // ISO time string
  windSpeedMax: number; // km/h
  windDirection: number; // degrees
}

export interface HourlyForecast {
  time: string;
  temp: number;
  rainChance: number;
  rain: number;         // mm of precipitation this hour
  conditionCode: number;
  windSpeed: number;    // km/h
  uvIndex: number;
}

export interface WeatherData {
  temp: number;
  apparentTemp: number;  // Feels-like temperature
  conditionCode: number;
  conditionText: string;
  rainForecast24h: number;
  rainChance: number;
  isRainy: boolean;
  windSpeed: number;
  windDirection: number; // degrees 0–360
  humidity: number;
  uvIndex: number;       // current UV index
  moistureDeficit: number; // SMD: accumulated ET₀ - rain over past 2 days (mm)
  locationName?: string;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
}

// WMO Weather interpretation codes (Open-Meteo)
export const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
};

const WEATHER_CACHE_KEY = 'lora_weather_cache';
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const fetchLocalWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      try {
        const { timestamp, data, lat: cLat, lon: cLon } = JSON.parse(cached);
        if (Date.now() - timestamp < WEATHER_CACHE_TTL && 
            Math.abs(cLat - lat) < 0.01 && 
            Math.abs(cLon - lon) < 0.01) {
          return data;
        }
      } catch (e) {
        // Ignore invalid cache
      }
    }

    // Comprehensive API call:
    // - past_days=2: used for Soil Moisture Deficit calculation
    // - apparent_temperature: feels-like for field workers
    // - precipitation (hourly): accurate 24h rain accumulation
    const weatherUrl = [
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`,
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,uv_index`,
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max`,
      `,uv_index_max,et0_fao_evapotranspiration,sunrise,sunset,wind_speed_10m_max,wind_direction_10m_dominant`,
      `&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,uv_index`,
      `&timezone=auto&forecast_days=7&past_days=2`,
    ].join('');

    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error("Weather API failed");

    const weatherData = await weatherRes.json();

    // Reverse Geocoding — cascading strategies
    let locationName = "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
        { headers: { 'User-Agent': 'LoRaWaterMonitor/1.0' }, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const addr = osmData.address;
        const parts = [
          addr.village || addr.hamlet || addr.road || addr.suburb || addr.city_district,
          addr.city || addr.town || addr.county || addr.state
        ].filter(Boolean);
        if (parts.length > 0) locationName = parts.slice(0, 2).join(", ");
      }
    } catch (e) { console.warn("OSM geocoding failed", e); }

    if (!locationName) {
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        if (bdcRes.ok) {
          const data = await bdcRes.json();
          const parts = [
            data.locality || data.city || data.town || data.village,
            data.principalSubdivision
          ].filter(Boolean);
          if (parts.length > 0) locationName = parts.join(", ");
        }
      } catch (e) { console.warn("BigDataCloud geocoding failed", e); }
    }

    if (!locationName) {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results?.length > 0) {
            const r = geoData.results[0];
            locationName = r.admin1 ? `${r.name}, ${r.admin1}` : r.name;
          }
        }
      } catch (e) { console.warn("Open-Meteo geocoding failed", e); }
    }

    if (!locationName) locationName = "Local Field";

    // ── Find today's index in the daily array (past_days=2 shifts the array) ──
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDailyIdx = weatherData.daily.time.indexOf(todayStr);
    // Fallback: if date not found (timezone edge cases), assume idx 2 (past_days=2)
    const todayIdx = todayDailyIdx >= 0 ? todayDailyIdx : Math.min(2, weatherData.daily.time.length - 1);

    // ── Soil Moisture Deficit (SMD) from past 2 days ──────────────────────────
    // SMD = Σ ET₀ (past 2 days) − Σ precipitation (past 2 days), floored at 0
    const et0Past2 = (weatherData.daily.et0_fao_evapotranspiration?.[todayIdx - 2] ?? 0)
                   + (weatherData.daily.et0_fao_evapotranspiration?.[todayIdx - 1] ?? 0);
    const rainPast2 = (weatherData.daily.precipitation_sum?.[todayIdx - 2] ?? 0)
                    + (weatherData.daily.precipitation_sum?.[todayIdx - 1] ?? 0);
    const moistureDeficit = parseFloat(Math.max(0, et0Past2 - rainPast2).toFixed(1));

    // ── Process Daily Data — only from today onwards (skip past days) ─────────
    const daily: DailyForecast[] = weatherData.daily.time
      .slice(todayIdx)
      .map((_: string, i: number) => {
        const idx = todayIdx + i;
        return {
          time: weatherData.daily.time[idx],
          tempMax: weatherData.daily.temperature_2m_max[idx],
          tempMin: weatherData.daily.temperature_2m_min[idx],
          rainSum: weatherData.daily.precipitation_sum[idx] ?? 0,
          rainChance: weatherData.daily.precipitation_probability_max[idx] ?? 0,
          conditionCode: weatherData.daily.weather_code[idx],
          conditionText: getWeatherCondition(weatherData.daily.weather_code[idx]),
          uvIndexMax: weatherData.daily.uv_index_max?.[idx] ?? 0,
          et0: parseFloat((weatherData.daily.et0_fao_evapotranspiration?.[idx] ?? 0).toFixed(2)),
          sunrise: weatherData.daily.sunrise?.[idx] ?? '',
          sunset: weatherData.daily.sunset?.[idx] ?? '',
          windSpeedMax: weatherData.daily.wind_speed_10m_max?.[idx] ?? 0,
          windDirection: weatherData.daily.wind_direction_10m_dominant?.[idx] ?? 0,
        };
      });

    // ── Process Hourly Data (next 24h) ────────────────────────────────────────
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const nowTs = now.getTime();

    const hourly: HourlyForecast[] = weatherData.hourly.time
      .map((t: string, i: number) => ({
        time: t,
        temp: weatherData.hourly.temperature_2m[i],
        rainChance: weatherData.hourly.precipitation_probability[i],
        rain: weatherData.hourly.precipitation?.[i] ?? 0,
        conditionCode: weatherData.hourly.weather_code[i],
        windSpeed: weatherData.hourly.wind_speed_10m?.[i] ?? 0,
        uvIndex: weatherData.hourly.uv_index?.[i] ?? 0,
      }))
      .filter((h: HourlyForecast) => new Date(h.time).getTime() >= nowTs)
      .slice(0, 24);

    // ── rainForecast24h — sum actual hourly precipitation (not a daily fraction) ──
    const rainForecast24h = parseFloat(
      hourly.reduce((sum, h) => sum + h.rain, 0).toFixed(1)
    );

    const currentCode = weatherData.current.weather_code;

    const result: WeatherData = {
      temp: weatherData.current.temperature_2m,
      apparentTemp: weatherData.current.apparent_temperature ?? weatherData.current.temperature_2m,
      conditionCode: currentCode,
      conditionText: getWeatherCondition(currentCode),
      rainForecast24h,
      rainChance: daily[0]?.rainChance ?? 0,
      isRainy: currentCode >= 51,
      windSpeed: weatherData.current.wind_speed_10m,
      windDirection: weatherData.current.wind_direction_10m ?? 0,
      humidity: weatherData.current.relative_humidity_2m,
      uvIndex: weatherData.current.uv_index ?? 0,
      moistureDeficit,
      locationName,
      daily,
      hourly,
    };

    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        lat, lon,
        data: result
      }));
    } catch (e) { }

    return result;
  } catch (e) {
    console.error("Failed to fetch weather", e);
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      try {
        const { data, lat: cLat, lon: cLon } = JSON.parse(cached);
        if (Math.abs(cLat - lat) < 0.01 && Math.abs(cLon - lon) < 0.01) {
          console.log("Using stale weather cache due to fetch failure");
          return data;
        }
      } catch (ce) { }
    }
    throw e;
  }
};

export const getUserLocation = (): Promise<{ lat: number, lon: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      (error) => { console.error("Geolocation error:", error); reject(error); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
};
