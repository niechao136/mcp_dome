const express = require('express')
const parser = require('body-parser')
const axios = require('axios')

const app = express()
const PORT = 8080

app.use(parser.json())
app.use(express.static('.'))

// ✅ 主要 API：天气查询工具
app.post('/weather', async (req, res) => {
  const { city } = req.body

  if (!city) return res.status(400).json({ error: 'Missing city field' })

  try {
    // 使用 Open-Meteo API（无需授权）
    const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)
    const location = geo.data.results?.[0]

    if (!location) return res.status(404).json({ error: 'City not found' })

    const { latitude, longitude, name, country } = location

    const weather = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`)
    const current = weather.data.current

    const reply = `${name}, ${country} 当前温度是 ${current.temperature_2m}°C，天气代码为 ${current.weathercode}。`

    res.json({ reply })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Weather query failed' })
  }
})

app.listen(PORT, () => {
  console.log(`✅ MCP tool server is running at http://localhost:${PORT}`)
})
