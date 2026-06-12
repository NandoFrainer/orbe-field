/**
 * POST /api/import-sheet
 *
 * Importa dados da planilha Google Sheets para o Firestore.
 * A planilha é SOMENTE LEITURA — nenhum dado é gravado nela.
 *
 * Body: { tableId: string } ou { importAll: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyIdToken } from '@/lib/firebase-admin'
import { readPriceTableRows } from '@/lib/sheets'
import { importSheetSchema } from '@/lib/validations/priceTable'
import { FieldValue } from 'firebase-admin/firestore'
import type { PriceTable, ImportedRow } from '@/types'

// Rate limit simples em memória (por tableId)
const lastImportMap = new Map<string, number>()
const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutos

async function getRequestUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = await verifyIdToken(token)
    const doc = await getAdminDb().collection('users').doc(decoded.uid).get()
    if (!doc.exists) return null
    return { uid: decoded.uid, ...doc.data() } as { uid: string; role: string; status: string; email?: string }
  } catch {
    return null
  }
}

async function importTable(tableId: string): Promise<{ rowCount: number }> {
  const adminDb = getAdminDb()
  const tableRef = adminDb.collection('price_tables').doc(tableId)
  const tableSnap = await tableRef.get()

  if (!tableSnap.exists) {
    throw new Error(`Tabela ${tableId} não encontrada`)
  }

  const table = tableSnap.data() as PriceTable

  // Rate limit: 1 importação a cada 5 minutos por tabela
  const lastImport = lastImportMap.get(tableId) ?? 0
  if (Date.now() - lastImport < RATE_LIMIT_MS) {
    throw new Error('Aguarde 5 minutos entre importações da mesma tabela')
  }
  lastImportMap.set(tableId, Date.now())

  // Marca como "pending"
  await tableRef.update({
    importStatus: 'pending',
    importError: null,
    updatedAt: FieldValue.serverTimestamp(),
  })

  try {
    // LÊ a planilha (somente leitura — nunca escreve)
    const rows = await readPriceTableRows(
      table.sheetId,
      table.sheetName || 'Produtos',
      table.dataStartRow || 2,
      table.columnMap
    )

    // Salva linhas na subcoleção para evitar limite de 1 MB do Firestore
    const batch = adminDb.batch()

    // Remove rows antigas
    const oldRowsSnap = await adminDb
      .collection('price_tables')
      .doc(tableId)
      .collection('rows')
      .listDocuments()
    oldRowsSnap.forEach((ref) => batch.delete(ref))
    await batch.commit()

    // Insere novas rows em lotes de 500
    const BATCH_SIZE = 500
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE)
      const newBatch = adminDb.batch()
      chunk.forEach((row) => {
        const ref = adminDb
          .collection('price_tables')
          .doc(tableId)
          .collection('rows')
          .doc()
        newBatch.set(ref, row)
      })
      await newBatch.commit()
    }

    // Atualiza documento principal com resumo
    await tableRef.update({
      lastImportedAt: FieldValue.serverTimestamp(),
      importStatus: 'success',
      importError: null,
      rowCount: rows.length,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { rowCount: rows.length }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
    await tableRef.update({
      importStatus: 'error',
      importError: errorMsg,
      updatedAt: FieldValue.serverTimestamp(),
    })
    throw err
  }
}

export async function POST(request: NextRequest) {
  const reqUser = await getRequestUser(request)
  if (!reqUser || reqUser.role !== 'admin' || reqUser.status !== 'active') {
    return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = importSheetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const { tableId, importAll } = parsed.data
  const adminDb = getAdminDb()
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  try {
    if (importAll) {
      // Importa todas as tabelas
      const tablesSnap = await adminDb.collection('price_tables').get()
      const results: Array<{ tableId: string; rowCount: number; error?: string }> = []

      for (const tableDoc of tablesSnap.docs) {
        try {
          const { rowCount } = await importTable(tableDoc.id)
          results.push({ tableId: tableDoc.id, rowCount })
        } catch (err) {
          results.push({
            tableId: tableDoc.id,
            rowCount: 0,
            error: err instanceof Error ? err.message : 'Erro',
          })
        }
      }

      // Audit log
      await adminDb.collection('audit_logs').add({
        userId: reqUser.uid,
        userEmail: reqUser.email ?? '',
        action: 'IMPORT_SHEET',
        collection: 'price_tables',
        documentId: 'all',
        before: null,
        after: { results },
        ip,
        createdAt: FieldValue.serverTimestamp(),
      })

      return NextResponse.json({
        success: true,
        data: results,
        message: `${results.filter((r) => !r.error).length}/${results.length} tabelas importadas`,
      })
    }

    if (tableId) {
      const { rowCount } = await importTable(tableId)

      await adminDb.collection('audit_logs').add({
        userId: reqUser.uid,
        userEmail: reqUser.email ?? '',
        action: 'IMPORT_SHEET',
        collection: 'price_tables',
        documentId: tableId,
        before: null,
        after: { rowCount },
        ip,
        createdAt: FieldValue.serverTimestamp(),
      })

      return NextResponse.json({
        success: true,
        data: { tableId, rowCount },
        message: `${rowCount} linhas importadas`,
      })
    }

    return NextResponse.json({ success: false, error: 'Informe tableId ou importAll' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro na importação'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
