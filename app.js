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

  const timeEl = document.getElementById('time');
  // Wrap AM/PM in a smaller span
  const ampm = timeStr.match(/\s?(AM|PM)$/i);
  if (ampm) {
    const main = timeStr.slice(0, ampm.index);
    timeEl.innerHTML = main + `<span class="ampm">${ampm[0].trim()}</span>`;
  } else {
    timeEl.textContent = timeStr;
  }
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
    `&current=temperature_2m,weather_code,is_day,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=celsius` +
    `&wind_speed_unit=kmh` + 
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

  // Update detailed stats
  document.getElementById('detail-feels-like').textContent = `${Math.round(cur.apparent_temperature)}°C`;
  document.getElementById('detail-humidity').textContent   = `${cur.relative_humidity_2m}%`;
  document.getElementById('detail-wind').textContent       = `${cur.wind_speed_10m} km/h`;
  document.getElementById('detail-precip').textContent     = `${cur.precipitation} mm`;

  // Update Hourly (48h)
  const hEl = document.getElementById('hourly-forecast');
  hEl.innerHTML = '';
  // Open-Meteo returns hourly arrays.
  const hourly = data.hourly;
  
  // Find index for current time
  const now = new Date();
  let startIndex = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    // hourly.time strings are local time if timezone=auto
    if (new Date(hourly.time[i]) >= now) {
      startIndex = i;
      break;
    }
  }
  // Back up one hour so we see current hour's "forecast" or just-passed hour
  if (startIndex > 0) startIndex--;

  // Take next 24 (or 48) hours
  const endIndex = Math.min(startIndex + 48, hourly.time.length);
  for (let i = startIndex; i < endIndex; i++) {
    const tStr = hourly.time[i];
    const temp = Math.round(hourly.temperature_2m[i]);
    const wCode = hourly.weather_code[i];
    
    // WMO map only gives us icon/label.
    const wInfo = WMO[wCode] || { icon: '?' };

    const dateObj = new Date(tStr);
    const hourLabel = dateObj.toLocaleTimeString([], { hour: 'numeric' });
    
    const el = document.createElement('div');
    el.className = 'hour-item';
    el.innerHTML = `
      <div class="hour-time">${hourLabel}</div>
      <div class="hour-icon">${wInfo.icon}</div>
      <div class="hour-temp">${temp}°</div>
    `;
    hEl.appendChild(el);
  }

  // Update Daily (7 days)
  const dEl = document.getElementById('daily-forecast');
  dEl.innerHTML = '';
  const daily = data.daily; // { time: [], weather_code: [], temperature_2m_max: [], ... }
  
  // daily.time is "YYYY-MM-DD"
  for (let i = 0; i < daily.time.length; i++) {
    const tStr = daily.time[i];
    // Create date object - simple parsing to avoid timezone shifts on just "YYYY-MM-DD"
    // But since we want local day name, using the string with Current Timezone context is tricky.
    // simpler: append T00:00:00 to ensure local or use splitted components.
    const parts = tStr.split('-');
    const dateObj = new Date(parts[0], parts[1]-1, parts[2]);

    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const wCode = daily.weather_code[i];
    const wInfo = WMO[wCode] || { icon: '?' };

    const today = new Date();
    // Reset hours for comparison
    today.setHours(0,0,0,0);
    
    let dayLabel = dateObj.toLocaleDateString([], { weekday: 'long' });
    
    // Check if it is today/tomorrow
    if (dateObj.getTime() === today.getTime()) {
      dayLabel = 'Today';
    } else if (dateObj.getTime() === today.getTime() + 86400000) {
      dayLabel = 'Tomorrow';
    }

    const el = document.createElement('div');
    el.className = 'day-item';
    el.innerHTML = `
      <div class="day-name">${dayLabel}</div>
      <div class="day-icon">${wInfo.icon}</div>
      <div class="day-temp">
        <span class="high">${max}°</span>
        <span class="low">${min}°</span>
      </div>
    `;
    dEl.appendChild(el);
  }

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
setInterval(updateClock, 30_000);

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

  // Auto-hide button + cursor logic
  let hideTimeout;
  const showButton = () => {
    btn.classList.remove('hidden');
    document.body.classList.remove('cursor-hidden');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      btn.classList.add('hidden');
      document.body.classList.add('cursor-hidden');
    }, 3000);
  };

  ['mousemove', 'touchstart', 'click', 'keydown'].forEach(evt => 
    document.addEventListener(evt, showButton, { passive: true })
  );
  
  // Keep visible while hovering the button
  btn.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
  btn.addEventListener('mouseleave', () => {
    hideTimeout = setTimeout(() => btn.classList.add('hidden'), 3000);
  });

  // Show initially
  showButton();
}());

// ── Drag-to-scroll ──────────────────────────────────────────────────────────
// Shared flag: set true when any drag-scroll ends so the click handler can ignore the ensuing click
let dragScrollOccurred = false;

function addDragScroll(el, axis) {
  let isDown = false;
  let startX, startY, scrollLeft, scrollTop;
  let hasDragged = false;

  el.addEventListener('mousedown', (e) => {
    // Only primary mouse button
    if (e.button !== 0) return;
    isDown = true;
    hasDragged = false;
    startX = e.pageX;
    startY = e.pageY;
    scrollLeft = el.scrollLeft;
    scrollTop  = el.scrollTop;
    el.classList.add('dragging');
    e.preventDefault();
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    el.classList.remove('dragging');
    if (hasDragged) {
      dragScrollOccurred = true;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const dx = e.pageX - startX;
    const dy = e.pageY - startY;
    // Only start dragging after moving 4px to distinguish from clicks
    if (!hasDragged && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    hasDragged = true;
    e.preventDefault();
    if (axis === 'x') {
      el.scrollLeft = scrollLeft - dx;
    } else {
      el.scrollTop = scrollTop - dy;
    }
  });
}

addDragScroll(document.getElementById('hourly-forecast'), 'x');
addDragScroll(document.getElementById('daily-forecast'),  'x');

// ── Weather Details Toggle ──────────────────────────────────────────────────
(function () {
  const details  = document.getElementById('weather-details');
  const backdrop = document.getElementById('weather-backdrop');

  function open()  {
    details.classList.add('expanded');
    backdrop.classList.add('visible');
  }
  function close() {
    details.classList.remove('expanded');
    backdrop.classList.remove('visible');
  }

  document.getElementById('weather-section').addEventListener('click', () => {
    if (dragScrollOccurred) { dragScrollOccurred = false; return; }
    open();
  });

  backdrop.addEventListener('click', close);
}());
