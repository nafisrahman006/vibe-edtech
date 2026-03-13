// ============================================================
//  AI Log Analyzer — Gemini + Sanitize
//  Watches Docker container logs for errors
//  Sanitizes logs before sending to Gemini API
//  Posts analysis to Slack
//  Zero source code changes needed
// ============================================================

import Dockerode from 'dockerode'
import { GoogleGenAI } from '@google/genai'

const docker        = new Dockerode({ socketPath: '/var/run/docker.sock' })
const ai            = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const CONTAINER     = process.env.APP_CONTAINER || 'edtech-platform-app'
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL
const COOLDOWN_MS   = 60_000
const recentErrors  = new Map()

// ── Step 1: Sanitize — strip all sensitive data ──────────────
function sanitize(log) {
  return log
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/postgresql:\/\/[^\s]+/g, 'postgresql://[REDACTED]')
    .replace(/redis:\/\/[^\s]+/g, 'redis://[REDACTED]')
    .replace(/(\/\/[^:]+:)([^@\s]+)(@)/g, '$1[PASSWORD]$3')
    .replace(/sess:[a-zA-Z0-9_-]+/g, 'sess:[REDACTED]')
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[JWT]')
    // .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]')
    .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]')
    .replace(/\b[a-zA-Z0-9]{32,}\b/g, '[SECRET]')
    .replace(/(password|secret|token|api_key|apikey|auth)\s*[=:]\s*\S+/gi, '$1=[REDACTED]')
    .replace(/\b\d{10,13}\b/g, '[PHONE]')
}

// ── Step 2: Analyze — send clean log to Gemini ───────────────
async function analyze(rawLog) {
  const cleanLog = sanitize(rawLog)
  console.log('🧹 Log sanitized — sending to Gemini')

  const prompt = `
You are a Node.js / Express / PostgreSQL / Redis / Docker expert.
Analyze this error and respond in EXACTLY this format:

🔴 Root Cause: (1 sentence)

🔧 Fix:
1. (step one)
2. (step two)
3. (step three if needed)

💡 Code: (only if a code change is needed)

Stack: Node.js 20, Express, PostgreSQL, Redis, Docker Compose
Error: ${cleanLog}
  `

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    })
    return response.text()
  } catch (err) {
    return `⚠️ Gemini analysis failed: ${err.message}`
  }
}

// ── Step 3: Alert — post to Slack ────────────────────────────
async function sendSlack(rawLog, analysis) {
  if (!SLACK_WEBHOOK) return
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🚨 Error Detected — Lumina Learning' }
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Error:*\n\`\`\`${rawLog.slice(0, 400)}\`\`\`` }
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*🤖 AI Analysis:*\n${analysis}` }
          },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `Container: \`${CONTAINER}\` · ${new Date().toISOString()}` }]
          }
        ]
      })
    })
    console.log('📨 Slack alert sent')
  } catch (err) {
    console.error('Slack failed:', err.message)
  }
}

// ── Step 4: Watch Docker logs ─────────────────────────────────
async function watchLogs() {
  console.log(`👀 Watching container: ${CONTAINER}`)

  let target
  try {
    const containers = await docker.listContainers()
    target = containers.find(c => c.Names.some(n => n.includes(CONTAINER)))
  } catch (err) {
    console.error('Cannot connect to Docker:', err.message)
    process.exit(1)
  }

  if (!target) {
    console.error(`Container "${CONTAINER}" not found — retrying in 10s`)
    setTimeout(watchLogs, 10_000)
    return
  }

  const container = docker.getContainer(target.Id)
  const stream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail: 0
  })

  stream.on('data', async (chunk) => {
    const line = chunk.toString('utf8').slice(8).trim()
    if (!line) return

    const isError = (
      line.includes('ERROR') ||
      line.includes('Error')  ||
      line.includes('FATAL')  ||
      line.includes('Unhandled') ||
      line.includes('ECONNREFUSED') ||
      line.includes('ETIMEDOUT')
    )
    if (!isError) return

    // const key = line.slice(0, 120)
    const key = line.match(/code: '[A-Z_]+'/)?.[0] || line.slice(0, 120)
    if (recentErrors.has(key)) return
    recentErrors.set(key, Date.now())
    setTimeout(() => recentErrors.delete(key), COOLDOWN_MS)

    console.log(`\n🚨 Error:\n${line}`)
    const analysis = await analyze(line)
    console.log(`\n💡 Analysis:\n${analysis}\n`)
    // await sendSlack(line, analysis)
    // Send sanitized log to Slack ✅
    await sendSlack(sanitize(line), analysis)
  })

  stream.on('error', (err) => console.error('Stream error:', err.message))
  stream.on('end', () => {
    console.log('Stream ended — reconnecting in 5s')
    setTimeout(watchLogs, 5_000)
  })
}

// ── Start ─────────────────────────────────────────────────────
console.log('🚀 AI Log Analyzer started')
console.log(`📦 Container : ${CONTAINER}`)
console.log(`🤖 Model     : gemini-2.0-flash`)
console.log(`🧹 Sanitize  : enabled`)
console.log(`📨 Slack     : ${SLACK_WEBHOOK ? 'enabled' : 'disabled (set SLACK_WEBHOOK_URL)'}`)
console.log('─'.repeat(50))
watchLogs()