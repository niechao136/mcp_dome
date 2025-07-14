import express from 'express'
import parser from 'body-parser'
import axios from 'axios'
import * as franc from 'franc'
import iso6393to1 from 'iso-639-3-to-1'
import weatherCodeMapMulti from './weatherCodeMapMulti.js'

const app = express()
const PORT = process.env.PORT || 8080
const DEFAULT_LANG = process.env.DEFAULT_LANG || 'en'

app.use(parser.json())
app.use(express.static('.'))

function detectLang(text) {
  const lang3 = franc.franc(text)
  if (lang3 === 'und') {
    // 简单规则：如果是中文字符，默认 zh
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh'
    if (/[\u3040-\u30ff]/.test(text)) return 'ja' // 日文
    if (/[\uac00-\ud7af]/.test(text)) return 'ko' // 韩文
    return 'en' // 默认 fallback
  }

  // 如果 franc 返回合法语言，则转为 ISO 639-1
  return iso6393to1[lang3] || DEFAULT_LANG || 'en'
}

app.post('/v1/mcp', async (req, res) => {
  const body = req.body

  if (body.jsonrpc !== '2.0' || !body.id || !body.method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: body.id || null,
      error: { code: -32600, message: 'Invalid Request' },
    })
  }

  if (body.method !== 'weather') {
    return res.status(404).json({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32601, message: 'Method not found' },
    })
  }

  try {

    const city = body.params?.city
    if (!city) throw new Error('Missing city')

    // 自动识别城市名称使用的语言
    const lang = detectLang(city)
    // 使用 Open-Meteo API（无需授权）
    const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search`, {
      params: {
        name: city,
        count: 1,
        language: lang,
      },
    })
    const location = geo.data.results?.[0]

    if (!location) throw new Error('Missing city')

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

    return res.json({
      jsonrpc: '2.0',
      id: body.id,
      result: { reply },
    })
  } catch (err) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32000, message: err.message },
    })
  }
})

app.listen(PORT, () => {
  console.log(`✅ MCP 服务运行中: http://localhost:${PORT}/v1/mcp`)
})
