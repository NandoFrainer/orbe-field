/**
 * POST /api/catalog/products/move
 * Body: { cod: string, newFamilyCode: string }
 *
 * Salva um override de família em catalog_product_overrides/{cod}.
 * O override é aplicado na próxima leitura de /api/catalog/products.
 *
 * DELETE /api/catalog/products/move
 * Body: { cod: string }
 * Remove o override, restaurando a família original da planilha.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { cod, newFamilyCode } = await req.json()
    if (!cod || !newFamilyCode) {
      return NextResponse.json({ error: 'cod e newFamilyCode obrigatórios' }, { status: 400 })
    }
    const db = getAdminDb()
    await db.collection('catalog_product_overrides').doc(cod).set({
      familyCode: newFamilyCode,
      updatedAt: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[catalog/products/move]', err)
    return NextResponse.json({ error: 'Erro ao mover produto' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { cod } = await req.json()
    if (!cod) return NextResponse.json({ error: 'cod obrigatório' }, { status: 400 })
    const db = getAdminDb()
    await db.collection('catalog_product_overrides').doc(cod).delete()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[catalog/products/move DELETE]', err)
    return NextResponse.json({ error: 'Erro ao remover override' }, { status: 500 })
  }
}
