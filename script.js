/* ---------- CONFIG ---------- */
const API_KEY = "15133bb2990d7b7cdf9aea19ab4a5d78";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

/* ---------- DOM ---------- */
const cityInput = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search");

const cityElement = document.querySelector("#city");
const tempElement = document.querySelector("#temperature span");
const descElement = document.querySelector("#description");
const weatherIconElement = document.querySelector("#weather-icon");
const countryElement = document.querySelector("#country");
const humidityElement = document.querySelector("#humidity span");
const windElement = document.querySelector("#wind span");
const msgElement = document.querySelector("#msg");

/* ---------- Detectar cidade via IP (com fallbacks) ---------- */
async function getUserCity() {
  const services = [
    { name: "ipapi.co", url: "https://ipapi.co/json/" },
    { name: "ipwho.is", url: "https://ipwho.is/" },
    { name: "geolocation-db", url: "https://geolocation-db.com/json/" },
  ];

  for (const s of services) {
    try {
      const res = await fetch(s.url);
      if (!res.ok) continue;
      const data = await res.json();

      const city = data.city || data.city_name || data.region || null;
      if (city) return city;
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

/* ---------- Buscar clima (OpenWeather) ---------- */
async function getWeatherData(city) {
  const url = `${WEATHER_URL}?q=${encodeURIComponent(
    city
  )}&appid=${API_KEY}&units=metric&lang=pt_br`;
  const res = await fetch(url);
  return await res.json();
}

/* ---------- Função única: pega hora local coerente ---------- */
function getLocalTimeForDisplay(timezoneSeconds, baseMs = Date.now()) {
  const tz = Number(timezoneSeconds) || 0;
  const localMs = baseMs + tz * 1000;
  const d = new Date(localMs);

  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const seconds = d.getUTCSeconds();

  const formatted = d.toLocaleTimeString("pt-BR", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });

  return { hours, minutes, seconds, formatted };
}

/* ---------- Mostrar dados ---------- */
async function showWeatherData(city) {
  if (!city) return;
  msgElement.innerHTML = "Carregando...";

  const data = await getWeatherData(city);

  if (!data || data.cod !== 200) {
    msgElement.innerHTML = "Cidade não encontrada.";
    cityElement.innerText = "--";
    tempElement.innerText = "--";
    descElement.innerText = "--";
    weatherIconElement.removeAttribute("src");
    countryElement.removeAttribute("src");
    humidityElement.innerText = "--";
    windElement.innerText = "--";
    return;
  }

  cityElement.innerText = data.name || "--";
  tempElement.innerText = Number.isFinite(data.main?.temp)
    ? Math.round(data.main.temp)
    : "--";
  descElement.innerText = data.weather?.[0]?.description || "--";

  if (data.weather?.[0]?.icon) {
    weatherIconElement.setAttribute(
      "src",
      `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
    );
    weatherIconElement.setAttribute(
      "alt",
      data.weather[0].description || "Ícone clima"
    );
  } else {
    weatherIconElement.removeAttribute("src");
  }

  if (data.sys?.country) {
    countryElement.setAttribute(
      "src",
      `https://flagsapi.com/${data.sys.country}/shiny/64.png`
    );
    countryElement.setAttribute("alt", data.sys.country);
  } else {
    countryElement.removeAttribute("src");
  }

  humidityElement.innerText =
    data.main?.humidity != null ? `${data.main.humidity}%` : "--";
  windElement.innerText =
    data.wind?.speed != null ? `${data.wind.speed} km/h` : "--";

  const timezone = data.timezone || 0;
  const local = getLocalTimeForDisplay(timezone);

  msgElement.innerHTML = `Agora são ${local.formatted} em ${data.name}${
    data.sys?.country ? ", " + data.sys.country : ""
  }`;

  aplicarFundoClima(
    (data.weather?.[0]?.description || "").toLowerCase(),
    local.hours
  );
  startClock(timezone);
}

/* ---------- Evento de pesquisa ---------- */
if (searchBtn) {
  searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) showWeatherData(city);
  });
}

/* ---------- Fundo dinâmico ---------- */
function aplicarFundoClima(description, hour) {
  const isDay = typeof hour === "number" ? hour >= 6 && hour < 18 : true;
  let img = "";

  if (description.includes("chuva")) {
    img = isDay ? "assets/bg_rainy_day.jpg" : "assets/bg_rainy_night.jpg";
  } else if (
    description.includes("nuvens") ||
    description.includes("nublado")
  ) {
    img = isDay ? "assets/bg_cloudy_day.jpg" : "assets/bg_cloudy_night.jpg";
  } else {
    img = isDay ? "assets/bg_clear_day.jpg" : "assets/bg_clear_night.jpg";
  }

  document.body.style.backgroundImage = `url('${img}')`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
}

/* ---------- Relógio analógico (usa mesma função do texto) ---------- */
let clockInterval = null;
function startClock(timezoneSeconds) {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }

  function update() {
    const t = getLocalTimeForDisplay(timezoneSeconds);

    const hourDeg = (t.hours % 12) * 30 + t.minutes * 0.5;
    const minuteDeg = t.minutes * 6 + t.seconds * 0.1;
    const secondDeg = t.seconds * 6;

    document.getElementById("hour").style.transform = `rotate(${hourDeg}deg)`;
    document.getElementById("minute").style.transform = `rotate(${minuteDeg}deg)`;
    document.getElementById("second").style.transform = `rotate(${secondDeg}deg)`;
  }

  update();
  clockInterval = setInterval(update, 1000);
}

/* ---------- Inicialização automática ---------- */
window.addEventListener("load", async () => {
  msgElement.innerHTML = "Detectando cidade...";
  const userCity = await getUserCity();
  if (userCity) {
    cityInput.value = userCity;
    await showWeatherData(userCity);
  } else {
    msgElement.innerHTML = "Não foi possível detectar sua cidade.";
  }
});
