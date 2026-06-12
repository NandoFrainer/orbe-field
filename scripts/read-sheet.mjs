/**
 * Lê a estrutura da planilha Google Sheets (somente leitura)
 * Rode: node scripts/read-sheet.mjs
 */
import { readFileSync } from 'fs'
import { createSign } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
const env = {}
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1')
}

const clientEmail = env['FIREBASE_ADMIN_CLIENT_EMAIL']
const privateKey = env['FIREBASE_ADMIN_PRIVATE_KEY'].replace(/\\n/g, '\n')
const SHEET_ID = '1_9RE347l-SphKKLDUxeW97mineL3MfFu9a72D9NxhZg'

function makeJWT() {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const unsigned = `${header}.${body}`
  const sign = createSign('SHA256')
  sign.update(unsigned)
  return `${unsigned}.${sign.sign(privateKey, 'base64url')}`
}

async function getToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: makeJWT() })
  })
  const data = await res.json()
  if (data.error) throw new Error(JSON.stringify(data))
  return data.access_token
}

console.log('🔑 Obtendo token...')
const token = await getToken()
console.log('Token obtido ✓\n')

// Lista abas
const metaRes = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`,
  { headers: { Authorization: `Bearer ${token}` } }
)
const meta = await metaRes.json()
if (meta.error) {
  console.error('Erro ao acessar planilha:', meta.error.message)
  console.error('Verifique se a service account tem acesso à planilha.')
  process.exit(1)
}

const sheets = meta.sheets.map(s => s.properties.title)
console.log('📊 ABAS:')
sheets.forEach((s, i) => console.log(`  ${i + 1}. ${s}`))

// Lê primeiras 5 linhas de cada aba
console.log('\n📋 PRIMEIRAS LINHAS DE CADA ABA:')
for (const sheetName of sheets) {
  const range = encodeURIComponent(`'${sheetName}'!A1:Z5`)
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  console.log(`\n━━━ ${sheetName} ━━━`)
  if (data.values?.length) {
    data.values.forEach((row, i) => console.log(`  L${i + 1}: ${row.slice(0, 12).join(' | ')}`))
  } else {
    console.log('  (vazia ou sem acesso)')
  }
}
