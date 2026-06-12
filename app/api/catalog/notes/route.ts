/**
 * GET  /api/catalog/notes?cod=XXX   → lê observação do produto
 * POST /api/catalog/notes           → salva observação { cod, notes }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const cod = req.nextUrl.searchParams.get('cod')
  if (!cod) return NextResponse.json({ notes: '' })
  try {
    const db = getAdminDb()
    const snap = await db.collection('catalog_product_data').doc(cod).get()
    return NextResponse.json({ notes: snap.data()?.notes ?? '' })
  } catch (err) {
    console.error('[catalog/notes GET]', err)
    return NextResponse.json({ notes: '' })
  }
}

export async function POST(req: NextRequest) {
  const { cod, notes } = await req.json()
  if (!cod) return NextResponse.json({ error: 'cod obrigatório' }, { status: 400 })
  const db = getAdminDb()
  await db.collection('catalog_product_data').doc(cod).set({ notes }, { merge: true })
  return NextResponse.json({ ok: true })
}
