const form = document.querySelector("#greeting-form");
const nameInput = document.querySelector("#name");
const greeting = document.querySelector("#greeting");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();

  greeting.textContent = `Piacere di conoscerti, ${name}!`;
});

const clockTime = document.querySelector("#clock-time");
const clockDate = document.querySelector("#clock-date");
const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function updateClock() {
  const now = new Date();
  clockTime.textContent = timeFormatter.format(now);
  clockTime.dateTime = now.toISOString();
  clockDate.textContent = dateFormatter.format(now);
}

updateClock();
setInterval(updateClock, 1000);

const weatherForm = document.querySelector("#weather-form");
const cityInput = document.querySelector("#city");
const weatherButton = weatherForm.querySelector("button");
const weatherStatus = document.querySelector("#weather-status");
const weatherResult = document.querySelector("#weather-result");
const weatherPlace = document.querySelector("#weather-place");
const weatherIcon = document.querySelector("#weather-icon");
const weatherTemp = document.querySelector("#weather-temp");
const weatherDesc = document.querySelector("#weather-desc");
const weatherFeels = document.querySelector("#weather-feels");
const weatherHumidity = document.querySelector("#weather-humidity");
const weatherWind = document.querySelector("#weather-wind");

const CITY_STORAGE_KEY = "weather:lastCity";

// Codici WMO restituiti da Open-Meteo: [descrizione, icona giorno, icona notte]
const WEATHER_CODES = {
  0: ["Sereno", "☀️", "🌙"],
  1: ["Prevalentemente sereno", "🌤️", "🌙"],
  2: ["Parzialmente nuvoloso", "⛅", "☁️"],
  3: ["Coperto", "☁️", "☁️"],
  45: ["Nebbia", "🌫️", "🌫️"],
  48: ["Nebbia con brina", "🌫️", "🌫️"],
  51: ["Pioggerella leggera", "🌦️", "🌧️"],
  53: ["Pioggerella", "🌦️", "🌧️"],
  55: ["Pioggerella intensa", "🌧️", "🌧️"],
  56: ["Pioggerella gelata", "🌧️", "🌧️"],
  57: ["Pioggerella gelata intensa", "🌧️", "🌧️"],
  61: ["Pioggia leggera", "🌦️", "🌧️"],
  63: ["Pioggia", "🌧️", "🌧️"],
  65: ["Pioggia forte", "🌧️", "🌧️"],
  66: ["Pioggia gelata", "🌧️", "🌧️"],
  67: ["Pioggia gelata forte", "🌧️", "🌧️"],
  71: ["Neve leggera", "🌨️", "🌨️"],
  73: ["Neve", "❄️", "❄️"],
  75: ["Neve forte", "❄️", "❄️"],
  77: ["Granelli di neve", "🌨️", "🌨️"],
  80: ["Rovesci leggeri", "🌦️", "🌧️"],
  81: ["Rovesci", "🌧️", "🌧️"],
  82: ["Rovesci violenti", "⛈️", "⛈️"],
  85: ["Rovesci di neve", "🌨️", "🌨️"],
  86: ["Forti rovesci di neve", "❄️", "❄️"],
  95: ["Temporale", "⛈️", "⛈️"],
  96: ["Temporale con grandine", "⛈️", "⛈️"],
  99: ["Forte temporale con grandine", "⛈️", "⛈️"],
};

const numberFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });

let weatherRequest = 0;

function setWeatherStatus(message, isError = false) {
  weatherStatus.textContent = message;
  weatherStatus.classList.toggle("weather-status--error", isError);
  weatherStatus.hidden = false;
  weatherResult.hidden = true;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function loadWeather(city) {
  const requestId = ++weatherRequest;
  weatherButton.disabled = true;
  setWeatherStatus("Sto cercando…");

  try {
    const geoParams = new URLSearchParams({ name: city, count: "1", language: "it", format: "json" });
    const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${geoParams}`);
    if (requestId !== weatherRequest) return;

    const place = geo.results?.[0];
    if (!place) {
      setWeatherStatus(`Non ho trovato "${city}". Controlla il nome e riprova.`, true);
      return;
    }

    const forecastParams = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
      timezone: "auto",
    });
    const forecast = await fetchJson(`https://api.open-meteo.com/v1/forecast?${forecastParams}`);
    if (requestId !== weatherRequest) return;

    renderWeather(place, forecast.current);
    saveCity(city);
  } catch {
    if (requestId !== weatherRequest) return;
    setWeatherStatus("Impossibile ottenere il meteo. Controlla la connessione e riprova.", true);
  } finally {
    if (requestId === weatherRequest) {
      weatherButton.disabled = false;
    }
  }
}

function renderWeather(place, current) {
  const [description, dayIcon, nightIcon] = WEATHER_CODES[current.weather_code] ?? ["Condizioni non disponibili", "🌡️", "🌡️"];
  const region = [place.admin1, place.country].filter(Boolean).join(", ");

  weatherPlace.textContent = region ? `${place.name} · ${region}` : place.name;
  weatherIcon.textContent = current.is_day ? dayIcon : nightIcon;
  weatherTemp.textContent = `${numberFormatter.format(current.temperature_2m)}°C`;
  weatherDesc.textContent = description;
  weatherFeels.textContent = `${numberFormatter.format(current.apparent_temperature)}°C`;
  weatherHumidity.textContent = `${numberFormatter.format(current.relative_humidity_2m)}%`;
  weatherWind.textContent = `${numberFormatter.format(current.wind_speed_10m)} km/h`;

  weatherStatus.hidden = true;
  weatherResult.hidden = false;
}

function saveCity(city) {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, city);
  } catch {
    // Il salvataggio è facoltativo: ignora se lo storage non è disponibile.
  }
}

function readSavedCity() {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

weatherForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    loadWeather(city);
  }
});

const savedCity = readSavedCity();
if (savedCity) {
  cityInput.value = savedCity;
  loadWeather(savedCity);
}
