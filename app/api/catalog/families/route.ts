/**
 * GET  /api/catalog/families          → lê todos os nomes de família
 * POST /api/catalog/families          → salva { key, name } ou cria nova pasta customizada { name, isNew: true }
 * DELETE /api/catalog/families        → body { key } — remove família customizada vazia
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET() {
  const db = getAdminDb()
  const snap = await db.collection('catalog_family_names').get()
  const names: Record<string, string> = {}
  const custom: string[] = []
  snap.docs.forEach((d) => {
    names[d.id] = d.data().name
    if (d.data().isCustom) custom.push(d.id)
  })
  return NextResponse.json({ names, custom })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getAdminDb()

  // Criar nova pasta customizada
  if (body.isNew) {
    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 })
    // Gera key única: slug + timestamp
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)
    const key = `custom_${slug}_${Date.now()}`
    await db.collection('catalog_family_names').doc(key).set({ name, isCustom: true })
    return NextResponse.json({ ok: true, key, name })
  }

  // Renomear família existente
  const { key, name } = body
  if (!key) return NextResponse.json({ error: 'key obrigatório' }, { status: 400 })
  await db.collection('catalog_family_names').doc(key).set({ name }, { merge: true })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  try {
    const { key } = await req.json()
    if (!key) return NextResponse.json({ error: 'key obrigatório' }, { status: 400 })
    const db = getAdminDb()
    // Só remove se for pasta customizada
    const doc = await db.collection('catalog_family_names').doc(key).get()
    if (!doc.exists || !doc.data()?.isCustom) {
      return NextResponse.json({ error: 'Só é possível remover pastas customizadas' }, { status: 400 })
    }
    await db.collection('catalog_family_names').doc(key).delete()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[catalog/families DELETE]', err)
    return NextResponse.json({ error: 'Erro ao remover pasta' }, { status: 500 })
  }
}
