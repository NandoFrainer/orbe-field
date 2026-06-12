/**
 * Lógica de importação da planilha Google Sheets — SOMENTE LEITURA
 *
 * Esta função LÊ dados da planilha e os salva no Firestore.
 * NUNCA escreve na planilha.
 */

import * as admin from 'firebase-admin'
import { google } from 'googleapis'
import type { ColumnMap } from './types'

// Scope de LEITURA APENAS — nunca alterar
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

function columnLetterToIndex(letter: string): number {
  letter = letter.toUpperCase()
  let result = 0
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64)
  }
  return result - 1
}

async function getSheetsClient() {
  // Em Cloud Functions, usa Firebase Secrets para as credenciais
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY
  const clientEmail = process.env.GOOGLE_SA_EMAIL

  if (!privateKey || !clientEmail) {
    throw new Error('Credenciais da Service Account não configuradas')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: [SHEETS_SCOPE],
  })

  return google.sheets({ version: 'v4', auth })
}

export interface ImportTableOptions {
  tableId: string
  sheetId: string
  sheetName: string
  dataStartRow: number
  columnMap: ColumnMap
}

export async function importTableData(options: ImportTableOptions): Promise<number> {
  const { tableId, sheetId, sheetName, dataStartRow, columnMap } = options
  const db = admin.firestore()
  const tableRef = db.collection('price_tables').doc(tableId)

  // Atualiza status para pending
  await tableRef.update({
    importStatus: 'pending',
    importError: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  try {
    const sheets = await getSheetsClient()

    // LÊ dados — somente leitura
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A${dataStartRow}:Z10000`,
      valueRenderOption: 'FORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    })

    const rawRows = (response.data.values as string[][] | null | undefined) ?? []

    // Mapeia colunas
    const nameIdx = columnLetterToIndex(columnMap.name)
    const descIdx = columnLetterToIndex(columnMap.description)
    const codeIdx = columnLetterToIndex(columnMap.code)
    const priceIdx = columnLetterToIndex(columnMap.price)
    const unitIdx = columnLetterToIndex(columnMap.unit)

    const mappedRows = rawRows
      .filter((row) => row.some((c) => c?.trim()))
      .map((row, i) => ({
        rowIndex: dataStartRow + i,
        name: row[nameIdx] ?? '',
        description: row[descIdx] ?? '',
        code: row[codeIdx] ?? '',
        price: row[priceIdx] ?? '',
        unit: row[unitIdx] ?? '',
        rawRow: row,
      }))

    // Salva em subcoleção (evita limite 1 MB do documento)
    const BATCH_SIZE = 500

    // Remove rows antigas
    const oldRefs = await db
      .collection('price_tables')
      .doc(tableId)
      .collection('rows')
      .listDocuments()

    if (oldRefs.length > 0) {
      for (let i = 0; i < oldRefs.length; i += BATCH_SIZE) {
        const batch = db.batch()
        oldRefs.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref))
        await batch.commit()
      }
    }

    // Insere novas rows
    for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
      const batch = db.batch()
      mappedRows.slice(i, i + BATCH_SIZE).forEach((row) => {
        const ref = db
          .collection('price_tables')
          .doc(tableId)
          .collection('rows')
          .doc()
        batch.set(ref, row)
      })
      await batch.commit()
    }

    // Atualiza documento principal
    await tableRef.update({
      lastImportedAt: admin.firestore.FieldValue.serverTimestamp(),
      importStatus: 'success',
      importError: null,
      rowCount: mappedRows.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Audit log
    await db.collection('audit_logs').add({
      userId: 'system',
      userEmail: 'scheduler@system',
      action: 'IMPORT_SHEET',
      collection: 'price_tables',
      documentId: tableId,
      before: null,
      after: { rowCount: mappedRows.length },
      ip: 'cloud-function',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return mappedRows.length
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await tableRef.update({
      importStatus: 'error',
      importError: msg,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    throw err
  }
}
