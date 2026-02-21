
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
  conditionCode: number;
  windSpeed: number;    // km/h
  uvIndex: number;
}

export interface WeatherData {
  temp: number;
  conditionCode: number;
  conditionText: string;
  rainForecast24h: number;
  rainChance: number;
  isRainy: boolean;
  windSpeed: number;
  windDirection: number; // degrees 0–360
  humidity: number;
  uvIndex: number;       // current UV index
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

export const fetchLocalWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    // Comprehensive API call including UV, ET0, sunrise/sunset, wind direction
    const weatherUrl = [
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`,
      `&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,uv_index`,
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max`,
      `,uv_index_max,et0_fao_evapotranspiration,sunrise,sunset,wind_speed_10m_max,wind_direction_10m_dominant`,
      `&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,uv_index`,
      `&timezone=auto&forecast_days=7`,
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

    // Process Daily Data
    const daily: DailyForecast[] = weatherData.daily.time.map((t: string, i: number) => ({
      time: t,
      tempMax: weatherData.daily.temperature_2m_max[i],
      tempMin: weatherData.daily.temperature_2m_min[i],
      rainSum: weatherData.daily.precipitation_sum[i] ?? 0,
      rainChance: weatherData.daily.precipitation_probability_max[i] ?? 0,
      conditionCode: weatherData.daily.weather_code[i],
      conditionText: getWeatherCondition(weatherData.daily.weather_code[i]),
      uvIndexMax: weatherData.daily.uv_index_max?.[i] ?? 0,
      et0: parseFloat((weatherData.daily.et0_fao_evapotranspiration?.[i] ?? 0).toFixed(2)),
      sunrise: weatherData.daily.sunrise?.[i] ?? '',
      sunset: weatherData.daily.sunset?.[i] ?? '',
      windSpeedMax: weatherData.daily.wind_speed_10m_max?.[i] ?? 0,
      windDirection: weatherData.daily.wind_direction_10m_dominant?.[i] ?? 0,
    }));

    // Process Hourly Data (next 24h)
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const nowTs = now.getTime();

    const hourly: HourlyForecast[] = weatherData.hourly.time
      .map((t: string, i: number) => ({
        time: t,
        temp: weatherData.hourly.temperature_2m[i],
        rainChance: weatherData.hourly.precipitation_probability[i],
        conditionCode: weatherData.hourly.weather_code[i],
        windSpeed: weatherData.hourly.wind_speed_10m?.[i] ?? 0,
        uvIndex: weatherData.hourly.uv_index?.[i] ?? 0,
      }))
      .filter((h: HourlyForecast) => new Date(h.time).getTime() >= nowTs)
      .slice(0, 24);

    const currentCode = weatherData.current.weather_code;

    return {
      temp: weatherData.current.temperature_2m,
      conditionCode: currentCode,
      conditionText: getWeatherCondition(currentCode),
      rainForecast24h: daily[0].rainSum,
      rainChance: daily[0].rainChance,
      isRainy: currentCode >= 51,
      windSpeed: weatherData.current.wind_speed_10m,
      windDirection: weatherData.current.wind_direction_10m ?? 0,
      humidity: weatherData.current.relative_humidity_2m,
      uvIndex: weatherData.current.uv_index ?? 0,
      locationName,
      daily,
      hourly,
    };
  } catch (e) {
    console.error("Failed to fetch weather", e);
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
