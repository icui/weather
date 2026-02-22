// ── Weather code → { label, icon, category } ───────────────────────────────
// WMO Weather interpretation codes (WW)
const WMO = {
  0:  { label: 'Clear Sky',           icon: '☀️',  cat: 'clear'   },
  1:  { label: 'Mainly Clear',        icon: '🌤️',  cat: 'clear'   },
  2:  { label: 'Partly Cloudy',       icon: '⛅',  cat: 'cloudy'  },
  3:  { label: 'Overcast',            icon: '☁️',  cat: 'cloudy'  },
  45: { label: 'Foggy',               icon: '🌫️',  cat: 'cloudy'  },
  48: { label: 'Icy Fog',             icon: '🌫️',  cat: 'cloudy'  },
  51: { label: 'Light Drizzle',       icon: '🌦️',  cat: 'rain'    },
  53: { label: 'Drizzle',             icon: '🌦️',  cat: 'rain'    },
  55: { label: 'Heavy Drizzle',       icon: '🌧️',  cat: 'rain'    },
  56: { label: 'Freezing Drizzle',    icon: '🌨️',  cat: 'snow'    },
  57: { label: 'Heavy Freezing Drizzle', icon: '🌨️', cat: 'snow'  },
  61: { label: 'Light Rain',          icon: '🌦️',  cat: 'rain'    },
  63: { label: 'Rain',                icon: '🌧️',  cat: 'rain'    },
  65: { label: 'Heavy Rain',          icon: '🌧️',  cat: 'rain'    },
  66: { label: 'Freezing Rain',       icon: '🌨️',  cat: 'snow'    },
  67: { label: 'Heavy Freezing Rain', icon: '🌨️',  cat: 'snow'    },
  71: { label: 'Light Snow',          icon: '❄️',  cat: 'snow'    },
  73: { label: 'Snow',                icon: '❄️',  cat: 'snow'    },
  75: { label: 'Heavy Snow',          icon: '❄️',  cat: 'snow'    },
  77: { label: 'Snow Grains',         icon: '🌨️',  cat: 'snow'    },
  80: { label: 'Light Showers',       icon: '🌦️',  cat: 'rain'    },
  81: { label: 'Showers',             icon: '🌧️',  cat: 'rain'    },
  82: { label: 'Heavy Showers',       icon: '⛈️',  cat: 'storm'   },
  85: { label: 'Snow Showers',        icon: '🌨️',  cat: 'snow'    },
  86: { label: 'Heavy Snow Showers',  icon: '🌨️',  cat: 'snow'    },
  95: { label: 'Thunderstorm',        icon: '⛈️',  cat: 'storm'   },
  96: { label: 'Thunderstorm w/ Hail',icon: '⛈️',  cat: 'storm'   },
  99: { label: 'Thunderstorm w/ Heavy Hail', icon: '⛈️', cat: 'storm' },
};

// ── Clock ───────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('time').textContent = timeStr;
  document.getElementById('date').textContent = dateStr;
}

// ── Background theme ────────────────────────────────────────────────────────
function applyTheme(cat, isDay) {
  const prefix = isDay ? 'day' : 'night';
  const themeClasses = [
    'day-clear','day-cloudy','day-rain','day-snow','day-storm',
    'night-clear','night-cloudy','night-rain','night-snow','night-storm',
  ];
  document.body.classList.remove(...themeClasses);
  document.body.classList.add(`${prefix}-${cat}`);
}

// ── Weather fetch (Open-Meteo, free & no API key) ───────────────────────────
async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day` +
    `&temperature_unit=celsius` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchLocationName(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'WeatherClockApp/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  // Prefer city / town / village / county
  const a = data.address || {};
  return a.city || a.town || a.village || a.county || a.state || null;
}

function showWeather(data, locationName) {
  const cur  = data.current;
  const code = cur.weather_code;
  const isDay = cur.is_day === 1;
  const info = WMO[code] || { label: 'Unknown', icon: '🌡️', cat: 'cloudy' };

  document.getElementById('weather-icon').textContent = info.icon;
  document.getElementById('temperature').textContent  = `${Math.round(cur.temperature_2m)}°C`;
  document.getElementById('condition').textContent    = info.label;
  document.getElementById('location').textContent     = locationName || '';
  document.getElementById('weather-status').textContent = '';
  document.getElementById('weather-status').classList.remove('error');

  applyTheme(info.cat, isDay);
}

function setWeatherStatus(msg, isError = false) {
  const el = document.getElementById('weather-status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

async function loadWeather() {
  setWeatherStatus('Detecting location…');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        setWeatherStatus('Loading weather…');
        const [weatherData, locationName] = await Promise.all([
          fetchWeather(lat, lon),
          fetchLocationName(lat, lon),
        ]);
        showWeather(weatherData, locationName);
      } catch (err) {
        setWeatherStatus('Unable to load weather data.', true);
        console.error(err);
      }
    },
    (err) => {
      // Fallback: use IP-based location via Open-Meteo's auto-detect (not available)
      // Show a friendly message instead
      const messages = {
        1: 'Location access denied. Enable location to see weather.',
        2: 'Location unavailable.',
        3: 'Location request timed out.',
      };
      setWeatherStatus(messages[err.code] || 'Location unavailable.', true);
    },
    { timeout: 10000 } // 10 s — reasonable wait before surfacing a timeout error to the user
  );
}

// ── Init ────────────────────────────────────────────────────────────────────
updateClock();
setInterval(updateClock, 1000);

loadWeather();
// Refresh weather every 10 minutes
setInterval(loadWeather, 10 * 60 * 1000);

// ── Light / Dark mode toggle ─────────────────────────────────────────────────
(function () {
  const btn = document.getElementById('theme-toggle');
  const PREF_KEY = 'theme';
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyLightMode(light) {
    document.body.classList.toggle('light-mode', light);
    btn.textContent = light ? '🌙' : '☀️';
    btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    if (themeMeta) themeMeta.content = light ? '#89d4f5' : '#16213e';
  }

  // Restore saved preference, or fall back to system preference
  const saved = localStorage.getItem(PREF_KEY);
  const preferLight = saved === 'light' ||
    (saved === null && window.matchMedia('(prefers-color-scheme: light)').matches);
  applyLightMode(preferLight);

  btn.addEventListener('click', () => {
    const isLight = !document.body.classList.contains('light-mode');
    applyLightMode(isLight);
    localStorage.setItem(PREF_KEY, isLight ? 'light' : 'dark');
  });
}());
