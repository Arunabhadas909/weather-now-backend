import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();


app.use(cors({
  origin: ["https://weather-now-6khm.onrender.com","https://arun-weather-now-app.netlify.app"]
}));

const PORT = process.env.PORT || 5000;

const URL_FORECAST = "https://api.open-meteo.com/v1/forecast";


async function resolveCoords({ lat, lon }) {
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
      { headers: { "User-Agent": "WeatherBackend/1.0" } }
    );
    const geoData = await geoRes.json();

    return {
      city:
        geoData.address.city ||
        geoData.address.town ||
        geoData.address.village ||
        geoData.name,
      country: geoData.address.country,
      lat,
      lon,
      timezone: geoData.timezone || "auto",
    };
  } catch (err) {
    console.error("Reverse geocoding error:", err);
    return { city: null, country: null, lat, lon, timezone: "auto" };
  }
}


app.get("/api/weather", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) return res.status(400).json({ error: "lat/lon required" });

  try {
  
    const location = await resolveCoords({ lat, lon });
    const { city, country, timezone } = location;

 
    const url = `${URL_FORECAST}?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true` +
      `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,windspeed_10m,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=auto`;

    const weatherRes = await fetch(url);
    if (!weatherRes.ok) throw new Error("Weather API error: forecast not found");

    const data = await weatherRes.json();

 
    const currentTime = data.current_weather.time; 
    const index = data.hourly.time.indexOf(currentTime.slice(0, 13) + ":00");

    const current = {
      temperature: data.current_weather.temperature,
      windspeed: data.current_weather.windspeed,
      winddirection: data.current_weather.winddirection,
      weathercode: data.current_weather.weathercode,
      time: data.current_weather.time,
      feels_like: data.hourly.apparent_temperature[index],
      humidity: data.hourly.relative_humidity_2m[index],
      pressure: data.hourly.surface_pressure[index],
    };

    const response = {
      city,
      country,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      timezone: timezone || data.timezone,
      current,
      hourly: {
        time: data.hourly.time,
        temperature: data.hourly.temperature_2m,
        feels_like: data.hourly.apparent_temperature,
        humidity: data.hourly.relative_humidity_2m,
        pressure: data.hourly.surface_pressure,
        windspeed: data.hourly.windspeed_10m,
        weathercode: data.hourly.weathercode,
      },
      daily: {
        time: data.daily.time.slice(0, 4),
        temp_max: data.daily.temperature_2m_max.slice(0, 4),
        temp_min: data.daily.temperature_2m_min.slice(0, 4),
        weathercode: data.daily.weathercode.slice(0, 4),
      },
    };

    res.json(response);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

// app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

// const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
