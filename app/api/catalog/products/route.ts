/**
 * GET /api/catalog/products
 * Lê abas "preços" e "planilha RP" do Google Sheets (somente leitura),
 * mescla por COD e retorna produtos com família para agrupamento.
 */

import { NextResponse } from 'next/server'
import { createSign } from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'

const SHEET_ID = '1_9RE347l-SphKKLDUxeW97mineL3MfFu9a72D9NxhZg'

export interface CatalogProduct {
  cod: string
  descricao: string
  brl: number | null
  usd: number | null
  scsn: number | null
  sctrpf: number | null
  ipi: number | null
  ncm: string | null
  familia: string | null        // família efetiva (override ou planilha RP)
  familiaOriginal?: string | null  // família original da planilha RP
  hasOverride?: boolean            // se foi movido manualmente pelo admin
  estoque: number | null
}

function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null
  const clean = raw.replace(/[R$USD\s]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

/** Gera token OAuth2 com escopo do Sheets (igual ao script read-sheet.mjs) */
async function getSheetsToken(): Promise<string> {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const unsigned = `${header}.${body}`
  const sign    = createSign('SHA256')
  sign.update(unsigned)
  const jwt = `${unsigned}.${sign.sign(privateKey, 'base64url')}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (data.error) throw new Error(`Token Sheets: ${JSON.stringify(data)}`)
  return data.access_token
}

async function fetchRange(token: string, sheetName: string, range: string): Promise<string[][]> {
  const encoded = encodeURIComponent(`'${sheetName}'!${range}`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encoded}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`[catalog/products] Sheets erro ${res.status}:`, err)
    throw new Error(`Sheets API ${res.status}: ${err}`)
  }
  const data = await res.json()
  return (data.values as string[][]) ?? []
}

export async function GET() {
  try {
    const token = await getSheetsToken()

    // Lê planilha + overrides do Firestore em paralelo
    const db = getAdminDb()
    const [precosRows, rpRows, overridesSnap] = await Promise.all([
      fetchRange(token, 'preços', 'A2:H'),
      fetchRange(token, 'planilha RP', 'A2:K'),
      db.collection('catalog_product_overrides').get(),
    ])

    // Mapa COD → override de família
    const overrides = new Map<string, string>()
    overridesSnap.docs.forEach((d) => {
      const data = d.data()
      if (data.familyCode) overrides.set(d.id, data.familyCode)
    })

    // Mapa COD → família da planilha RP
    const familiaMap = new Map<string, { familia: string; estoque: number | null }>()
    for (const row of rpRows) {
      const cod = row[0]?.trim()
      if (!cod) continue
      const familia = row[1]?.trim() || null
      const estoque = parsePrice(row[7])
      if (familia) familiaMap.set(cod, { familia, estoque })
    }

    // Monta lista de produtos da aba preços
    const products: CatalogProduct[] = precosRows
      .filter((row) => row[0]?.trim())
      .map((row) => {
        const cod = row[0].trim()
        const rpData = familiaMap.get(cod)
        const familyOverride = overrides.get(cod)
        return {
          cod,
          descricao: row[1]?.trim() ?? '',
          brl: parsePrice(row[2]),
          usd: parsePrice(row[3]),
          scsn: parsePrice(row[4]),
          sctrpf: parsePrice(row[5]),
          ipi: parsePrice(row[6]),
          ncm: row[7]?.trim() || null,
          // Override tem prioridade sobre a planilha RP
          familia: familyOverride ?? rpData?.familia ?? null,
          familiaOriginal: rpData?.familia ?? null,
          hasOverride: !!familyOverride,
          estoque: rpData?.estoque ?? null,
        }
      })

    return NextResponse.json({ products, total: products.length })
  } catch (err) {
    console.error('[/api/catalog/products] erro:', err)
    return NextResponse.json({ error: 'Erro ao carregar produtos.' }, { status: 500 })
  }
}
