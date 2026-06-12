/**
 * Script de setup: cria/atualiza o documento admin no Firestore via REST API.
 * Rode UMA VEZ: node scripts/setup-admin.mjs
 */

import { readFileSync } from 'fs'
import { createSign } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

// Ler .env.local
const envFile = readFileSync(envPath, 'utf8')
const env = {}
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1')
  }
}

const projectId = env['FIREBASE_ADMIN_PROJECT_ID'] ?? 'orbe-field'
const clientEmail = env['FIREBASE_ADMIN_CLIENT_EMAIL']
const privateKey = env['FIREBASE_ADMIN_PRIVATE_KEY'].replace(/\\n/g, '\n')
const adminEmail = env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN']?.split('.')[0] ?? 'nandofrainer@gmail.com'

// UID do Firebase Auth (do log do browser)
const ADMIN_UID = 'zpD3IoDeJCRipeBiTthSIrlmxFH3'
const ADMIN_EMAIL = 'nandofrainer@gmail.com'
const ADMIN_NAME = 'Fernando'

console.log('🔧 Setup Admin Orbe Field')
console.log('Project:', projectId)
console.log('UID:', ADMIN_UID)
console.log('')

// Gera JWT para OAuth2
function makeJWT() {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const unsigned = `${header}.${body}`
  const sign = createSign('SHA256')
  sign.update(unsigned)
  const sig = sign.sign(privateKey, 'base64url')
  return `${unsigned}.${sig}`
}

// Obtém access token
async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: makeJWT()
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

// Verifica se documento existe
async function checkDocument(token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${ADMIN_UID}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  console.log('📋 Documento atual — status:', res.status)
  const body = await res.text()
  if (res.ok) {
    const doc = JSON.parse(body)
    const fields = doc.fields ?? {}
    console.log('  role:', fields.role?.stringValue)
    console.log('  status:', fields.status?.stringValue)
    console.log('  email:', fields.email?.stringValue)
    return true
  }
  console.log('  Documento não encontrado (será criado)')
  return false
}

// Cria/atualiza documento
async function upsertDocument(token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${ADMIN_UID}`
  const body = {
    fields: {
      email: { stringValue: ADMIN_EMAIL },
      name: { stringValue: ADMIN_NAME },
      role: { stringValue: 'admin' },
      status: { stringValue: 'active' },
      familyId: { nullValue: null },
      familyCode: { nullValue: null },
      createdAt: { timestampValue: new Date().toISOString() }
    }
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const result = await res.text()
  if (!res.ok) throw new Error(`Erro ao criar documento: ${res.status} ${result}`)
  console.log('✅ Documento criado/atualizado com sucesso!')
}

try {
  console.log('1. Obtendo token de acesso...')
  const token = await getAccessToken()
  console.log('   Token obtido ✓\n')

  console.log('2. Verificando documento atual...')
  const exists = await checkDocument(token)
  console.log('')

  console.log('3. Criando/atualizando documento admin...')
  await upsertDocument(token)
  console.log('')
  console.log('🎉 Pronto! Agora faça login em localhost:3000')
} catch (err) {
  console.error('❌ Erro:', err.message)
  process.exit(1)
}
