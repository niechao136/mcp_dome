const express = require('express')
const parser = require('body-parser')
const axios = require('axios')
const franc = require('franc')
const iso6393to1 = require('iso-639-3-to-1')
const weatherCodeMapMulti = require('./weatherCodeMapMulti')

const app = express()
const PORT = process.env.PORT || 8080
const DEFAULT_LANG = process.env.DEFAULT_LANG || 'en'

app.use(parser.json())
app.use(express.static('.'))

// ✅ 主要 API：天气查询工具
app.post('/weather', async (req, res) => {
  const { city } = req.body

  if (!city) return res.status(400).json({ error: 'Missing city field' })

  try {
    // 自动识别城市名称使用的语言
    const lang3 = franc.franc(city) // 返回 ISO 639-3 语言码
    const lang = iso6393to1[lang3] || DEFAULT_LANG // 转成 ISO 639-1，默认英文
    // 使用 Open-Meteo API（无需授权）
    const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search`, {
      params: {
        name: city,
        count: 1,
        language: lang,
      },
    })
    const location = geo.data.results?.[0]

    if (!location) return res.status(404).json({ error: 'City not found' })

    const { latitude, longitude, name, country } = location

    const weather = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,weathercode',
        timezone: 'auto',
      },
    })
    const current = weather.data.current

    const codeDesc = weatherCodeMapMulti[current.weathercode]?.[lang]
        || weatherCodeMapMulti[current.weathercode]?.[DEFAULT_LANG]
        || 'Unknown'

    const replyTemplates = {
      zh: `${name}, ${country} 当前温度是 ${current.temperature_2m}°C，天气情况：${codeDesc}。`,
      en: `Current temperature in ${name}, ${country} is ${current.temperature_2m}°C. Weather: ${codeDesc}.`,
      ja: `${name}（${country}）の現在の気温は${current.temperature_2m}°C、天気は${codeDesc}です。`,
      ko: `${country} ${name}의 현재 기온은 ${current.temperature_2m}°C, 날씨는 ${codeDesc}입니다.`,
    }

    const reply = replyTemplates[lang] || replyTemplates[DEFAULT_LANG]

    res.json({ reply })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Weather query failed' })
  }
})

app.listen(PORT, () => {
  console.log(`✅ MCP tool server is running at http://localhost:${PORT}`)
})
