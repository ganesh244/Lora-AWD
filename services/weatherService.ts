
export interface DailyForecast {
  time: string;
  tempMax: number;
  tempMin: number;
  rainSum: number;
  rainChance: number;
  conditionCode: number;
  conditionText: string;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  rainChance: number;
  conditionCode: number;
}

export interface WeatherData {
  temp: number;
  conditionCode: number;
  conditionText: string;
  rainForecast24h: number; // mm
  rainChance: number; // %
  isRainy: boolean;
  windSpeed: number; // km/h
  humidity: number; // %
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
    // 1. Get Weather Data (7 Days + Hourly) including Wind and Humidity
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&hourly=temperature_2m,weather_code,precipitation_probability&timezone=auto&forecast_days=7`;
    
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error("Weather API failed");
    
    const weatherData = await weatherRes.json();
    
    // 2. Robust Reverse Geocoding Strategy
    let locationName = "";
    
    // Strategy A: OpenStreetMap Nominatim (High accuracy for rural names)
    try {
        // Use a timeout to fail fast if OSM is slow
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
            headers: {
                'User-Agent': 'LoRaWaterMonitor/1.0' 
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (osmRes.ok) {
            const osmData = await osmRes.json();
            const addr = osmData.address;
            // Prioritize village/hamlet/road names
            const parts = [
                addr.village || addr.hamlet || addr.road || addr.suburb || addr.city_district,
                addr.city || addr.town || addr.county || addr.state
            ].filter(Boolean);
            
            if (parts.length > 0) {
                locationName = parts.slice(0, 2).join(", ");
            }
        }
    } catch (e) {
        console.warn("OSM geocoding failed or timed out", e);
    }

    // Strategy B: BigDataCloud (Backup)
    if (!locationName || locationName.includes("undefined")) {
        try {
            const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            if (bdcRes.ok) {
                const data = await bdcRes.json();
                const parts = [
                    data.locality || data.city || data.town || data.village,
                    data.principalSubdivision
                ].filter(Boolean);
                
                if (parts.length > 0) {
                    locationName = parts.join(", ");
                }
            }
        } catch (e) {
            console.warn("BigDataCloud geocoding failed", e);
        }
    }

    // Strategy C: Open-Meteo (Last resort)
    if (!locationName) {
        try {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`;
            const geoRes = await fetch(geoUrl);
            if (geoRes.ok) {
                const geoData = await geoRes.json();
                if (geoData.results && geoData.results.length > 0) {
                    const r = geoData.results[0];
                    locationName = r.name;
                    if (r.admin1) locationName += `, ${r.admin1}`;
                }
            }
        } catch (e) {
            console.warn("Open-Meteo geocoding failed", e);
        }
    }

    // Fallback if absolutely everything failed
    if (!locationName) {
        locationName = "Local Field";
    }

    // 3. Process Daily Data
    const daily: DailyForecast[] = weatherData.daily.time.map((t: string, i: number) => ({
        time: t,
        tempMax: weatherData.daily.temperature_2m_max[i],
        tempMin: weatherData.daily.temperature_2m_min[i],
        rainSum: weatherData.daily.precipitation_sum[i],
        rainChance: weatherData.daily.precipitation_probability_max[i],
        conditionCode: weatherData.daily.weather_code[i],
        conditionText: getWeatherCondition(weatherData.daily.weather_code[i])
    }));

    // 4. Process Hourly Data (Filter for next 24h)
    const now = new Date();
    now.setMinutes(0, 0, 0); // Round down to current hour
    const nowTs = now.getTime();

    const hourly: HourlyForecast[] = weatherData.hourly.time
        .map((t: string, i: number) => ({
            time: t,
            temp: weatherData.hourly.temperature_2m[i],
            rainChance: weatherData.hourly.precipitation_probability[i],
            conditionCode: weatherData.hourly.weather_code[i]
        }))
        .filter((h: HourlyForecast) => {
            const t = new Date(h.time).getTime();
            return t >= nowTs;
        })
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
      humidity: weatherData.current.relative_humidity_2m,
      locationName,
      daily,
      hourly
    };
  } catch (e) {
    console.error("Failed to fetch weather", e);
    throw e;
  }
};

export const getUserLocation = (): Promise<{lat: number, lon: number}> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
};
