/**
 * GET  /api/catalog/files?cod=XXX   → lista arquivos do produto
 * POST /api/catalog/files           → registra arquivo { cod, name, type, url, storageRef }
 * DELETE /api/catalog/files?id=XXX  → remove registro (não deleta Storage)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export type FileType = 'flyer' | 'desenho' | 'manual' | 'foto' | 'anexo' | 'outro'

export interface CatalogFile {
  id: string
  cod: string
  name: string
  type: FileType
  url: string
  storageRef: string
  uploadedAt: string
}

export async function GET(req: NextRequest) {
  const cod = req.nextUrl.searchParams.get('cod')
  if (!cod) return NextResponse.json({ files: [] })
  const db = getAdminDb()
  const snap = await db.collection('catalog_files').where('cod', '==', cod).get()
  const files: CatalogFile[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CatalogFile))
  return NextResponse.json({ files })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cod, name, type, url, storageRef } = body
  if (!cod || !name || !url) {
    return NextResponse.json({ error: 'cod, name e url obrigatórios' }, { status: 400 })
  }
  const db = getAdminDb()
  const ref = await db.collection('catalog_files').add({
    cod, name, type: type ?? 'outro', url, storageRef: storageRef ?? '',
    uploadedAt: new Date().toISOString(),
  })
  return NextResponse.json({ id: ref.id })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const db = getAdminDb()
  await db.collection('catalog_files').doc(id).delete()
  return NextResponse.json({ ok: true })
}
