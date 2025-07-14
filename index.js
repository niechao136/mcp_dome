const express = require('express')
const parser = require('body-parser')
const axios = require('axios')
const franc = require('franc')
const iso6393to1 = require('iso-639-3-to-1')

const app = express()
const PORT = 8080

app.use(parser.json())
app.use(express.static('.'))

const weatherCodeMapMulti = {
  0: { zh: '晴朗', en: 'Clear sky', ja: '快晴', ko: '맑음' },
  1: { zh: '主要晴天', en: 'Mainly clear', ja: '晴れ', ko: '대체로 맑음' },
  2: { zh: '部分多云', en: 'Partly cloudy', ja: '一部曇り', ko: '부분 흐림' },
  3: { zh: '多云', en: 'Overcast', ja: '曇り', ko: '흐림' },
  45: { zh: '雾', en: 'Fog', ja: '霧', ko: '안개' },
  48: { zh: '结霜雾', en: 'Depositing rime fog', ja: '霧氷を伴う霧', ko: '서리가 끼는 안개' },
  51: { zh: '轻度毛毛雨', en: 'Light drizzle', ja: '弱い霧雨', ko: '약한 이슬비' },
  53: { zh: '中度毛毛雨', en: 'Moderate drizzle', ja: '適度な霧雨', ko: '보통 이슬비' },
  55: { zh: '强毛毛雨', en: 'Dense drizzle', ja: '強い霧雨', ko: '강한 이슬비' },
  56: { zh: '轻度冻毛毛雨', en: 'Light freezing drizzle', ja: '弱い凍結霧雨', ko: '약한 어는 이슬비' },
  57: { zh: '强冻毛毛雨', en: 'Dense freezing drizzle', ja: '強い凍結霧雨', ko: '강한 어는 이슬비' },
  61: { zh: '小雨', en: 'Slight rain', ja: '小雨', ko: '약한 비' },
  63: { zh: '中雨', en: 'Moderate rain', ja: '普通の雨', ko: '보통 비' },
  65: { zh: '大雨', en: 'Heavy rain', ja: '大雨', ko: '강한 비' },
  66: { zh: '轻度冻雨', en: 'Light freezing rain', ja: '弱い凍結雨', ko: '약한 어는 비' },
  67: { zh: '强冻雨', en: 'Heavy freezing rain', ja: '強い凍結雨', ko: '강한 어는 비' },
  71: { zh: '小雪', en: 'Slight snow fall', ja: '弱い降雪', ko: '약한 눈' },
  73: { zh: '中雪', en: 'Moderate snow fall', ja: '普通の降雪', ko: '보통 눈' },
  75: { zh: '大雪', en: 'Heavy snow fall', ja: '大雪', ko: '강한 눈' },
  77: { zh: '雪粒', en: 'Snow grains', ja: '霰', ko: '싸락눈' },
  80: { zh: '小阵雨', en: 'Slight rain showers', ja: '弱いにわか雨', ko: '약한 소나기' },
  81: { zh: '中阵雨', en: 'Moderate rain showers', ja: '普通のにわか雨', ko: '보통 소나기' },
  82: { zh: '强阵雨', en: 'Violent rain showers', ja: '強いにわか雨', ko: '강한 소나기' },
  85: { zh: '小阵雪', en: 'Slight snow showers', ja: '弱いにわか雪', ko: '약한 소낙눈' },
  86: { zh: '强阵雪', en: 'Heavy snow showers', ja: '強いにわか雪', ko: '강한 소낙눈' },
  95: { zh: '雷阵雨', en: 'Thunderstorm', ja: '雷雨', ko: '뇌우' },
  96: { zh: '雷雨伴小冰雹', en: 'Thunderstorm with slight hail', ja: '小さな雹を伴う雷雨', ko: '약한 우박을 동반한 뇌우' },
  99: { zh: '雷雨伴大冰雹', en: 'Thunderstorm with heavy hail', ja: '大きな雹を伴う雷雨', ko: '강한 우박을 동반한 뇌우' }
}

// ✅ 主要 API：天气查询工具
app.post('/weather', async (req, res) => {
  const { city } = req.body

  if (!city) return res.status(400).json({ error: 'Missing city field' })

  try {
    // 自动识别城市名称使用的语言
    const lang3 = franc.franc(city); // 返回 ISO 639-3 语言码
    const lang = iso6393to1[lang3] || 'en'; // 转成 ISO 639-1，默认英文
    // 使用 Open-Meteo API（无需授权）
    const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search`, {
      params: {
        name: city,
        count: 1,
        language: lang
      }
    })
    const location = geo.data.results?.[0]

    if (!location) return res.status(404).json({ error: 'City not found' })

    const { latitude, longitude, name, country } = location

    const weather = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,weathercode',
        timezone: 'auto'
      }
    })
    const current = weather.data.current

    const codeDesc = weatherCodeMapMulti[current.weathercode]?.[lang]
        || weatherCodeMapMulti[current.weathercode]?.en
        || 'Unknown'

    const replyTemplates = {
      zh: `${name}, ${country} 当前温度是 ${current.temperature_2m}°C，天气情况：${codeDesc}。`,
      en: `Current temperature in ${name}, ${country} is ${current.temperature_2m}°C. Weather: ${codeDesc}.`,
      ja: `${name}（${country}）の現在の気温は${current.temperature_2m}°C、天気は${codeDesc}です。`,
      ko: `${country} ${name}의 현재 기온은 ${current.temperature_2m}°C, 날씨는 ${codeDesc}입니다.`
    }

    const reply = replyTemplates[lang] || replyTemplates['en']

    res.json({ reply })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Weather query failed' })
  }
})

app.listen(PORT, () => {
  console.log(`✅ MCP tool server is running at http://localhost:${PORT}`)
})
