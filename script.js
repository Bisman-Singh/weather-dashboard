const API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
const BASE = "https://api.openweathermap.org/data/2.5";

const $ = id => document.getElementById(id);
let useCelsius = true;
let lastData = null;

const WEATHER_EMOJI = {
    "01d": "☀️", "01n": "🌙", "02d": "⛅", "02n": "☁️",
    "03d": "☁️", "03n": "☁️", "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️", "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️", "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️"
};

function getEmoji(iconCode) {
    return WEATHER_EMOJI[iconCode] || "🌡️";
}

function loadRecent() {
    return JSON.parse(localStorage.getItem("weather_recent") || "[]");
}

function saveRecent(city) {
    let recent = loadRecent().filter(c => c.toLowerCase() !== city.toLowerCase());
    recent.unshift(city);
    if (recent.length > 8) recent = recent.slice(0, 8);
    localStorage.setItem("weather_recent", JSON.stringify(recent));
    renderRecent();
}

function renderRecent() {
    const list = $("recentList");
    const recent = loadRecent();
    list.innerHTML = recent.map(c =>
        `<span class="recent-chip" onclick="fetchWeather('${c}')">${c}</span>`
    ).join("");
}

function showError(msg) {
    $("errorMsg").textContent = msg;
    setTimeout(() => $("errorMsg").textContent = "", 4000);
}

function tempStr(kelvin) {
    if (useCelsius) return Math.round(kelvin - 273.15) + "°C";
    return Math.round((kelvin - 273.15) * 9 / 5 + 32) + "°F";
}

async function fetchWeather(city) {
    $("errorMsg").textContent = "";
    try {
        const res = await fetch(`${BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}`);
        if (!res.ok) throw new Error("City not found");
        const data = await res.json();
        lastData = data;
        updateCurrent(data);
        saveRecent(data.name);
        fetchForecast(data.coord.lat, data.coord.lon);
    } catch (e) {
        if (API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
            showDemoData(city);
        } else {
            showError(e.message);
        }
    }
}

async function fetchByCoords(lat, lon) {
    try {
        const res = await fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (!res.ok) throw new Error("Location not found");
        const data = await res.json();
        lastData = data;
        updateCurrent(data);
        saveRecent(data.name);
        fetchForecast(lat, lon);
    } catch (e) {
        if (API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
            showDemoData("Your Location");
        } else {
            showError(e.message);
        }
    }
}

async function fetchForecast(lat, lon) {
    try {
        const res = await fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (!res.ok) return;
        const data = await res.json();
        renderForecast(data.list);
    } catch {
        renderDemoForecast();
    }
}

function updateCurrent(data) {
    $("cityName").textContent = `${data.name}, ${data.sys.country}`;
    $("temperature").textContent = tempStr(data.main.temp);
    $("description").textContent = data.weather[0].description;
    $("weatherIcon").textContent = getEmoji(data.weather[0].icon);
    $("feelsLike").textContent = tempStr(data.main.feels_like);
    $("humidity").textContent = data.main.humidity + "%";
    $("wind").textContent = (data.wind.speed * 3.6).toFixed(1) + " km/h";
    $("pressure").textContent = data.main.pressure + " hPa";
    $("visibility").textContent = ((data.visibility || 0) / 1000).toFixed(1) + " km";
    $("uvIndex").textContent = "N/A";
}

function renderForecast(list) {
    const daily = [];
    const seen = new Set();
    for (const item of list) {
        const day = new Date(item.dt * 1000).toLocaleDateString("en", { weekday: "short" });
        if (!seen.has(day) && seen.size < 5) {
            seen.add(day);
            daily.push({ day, temp: item.main.temp, icon: item.weather[0].icon, desc: item.weather[0].description });
        }
    }
    $("forecastGrid").innerHTML = daily.map(d => `
        <div class="forecast-card">
            <div class="forecast-day">${d.day}</div>
            <div class="forecast-icon">${getEmoji(d.icon)}</div>
            <div class="forecast-temp">${tempStr(d.temp)}</div>
            <div class="forecast-desc">${d.desc}</div>
        </div>
    `).join("");
}

function showDemoData(city) {
    $("cityName").textContent = city || "Demo City";
    $("temperature").textContent = useCelsius ? "22°C" : "72°F";
    $("description").textContent = "partly cloudy (demo)";
    $("weatherIcon").textContent = "⛅";
    $("feelsLike").textContent = useCelsius ? "20°C" : "68°F";
    $("humidity").textContent = "65%";
    $("wind").textContent = "12.5 km/h";
    $("pressure").textContent = "1013 hPa";
    $("visibility").textContent = "10.0 km";
    $("uvIndex").textContent = "3";
    saveRecent(city || "Demo City");
    renderDemoForecast();
}

function renderDemoForecast() {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const icons = ["☀️", "⛅", "🌧️", "☁️", "☀️"];
    const temps = [24, 22, 18, 20, 25];
    const descs = ["sunny", "partly cloudy", "light rain", "overcast", "clear sky"];
    $("forecastGrid").innerHTML = days.map((d, i) => `
        <div class="forecast-card">
            <div class="forecast-day">${d}</div>
            <div class="forecast-icon">${icons[i]}</div>
            <div class="forecast-temp">${useCelsius ? temps[i] + "°C" : Math.round(temps[i] * 9/5 + 32) + "°F"}</div>
            <div class="forecast-desc">${descs[i]}</div>
        </div>
    `).join("");
}

$("searchBtn").addEventListener("click", () => {
    const city = $("cityInput").value.trim();
    if (city) fetchWeather(city);
});

$("cityInput").addEventListener("keydown", e => {
    if (e.key === "Enter") {
        const city = $("cityInput").value.trim();
        if (city) fetchWeather(city);
    }
});

$("locationBtn").addEventListener("click", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
            () => showError("Location access denied")
        );
    } else {
        showError("Geolocation not supported");
    }
});

$("unitToggle").addEventListener("click", () => {
    useCelsius = !useCelsius;
    if (lastData) updateCurrent(lastData);
    else showDemoData("Demo City");
});

renderRecent();
