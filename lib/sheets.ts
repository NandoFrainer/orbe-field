/**
 * Google Sheets helper — SOMENTE LEITURA
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REGRA ABSOLUTA E INVIOLÁVEL:                                    ║
 * ║  Este arquivo NUNCA deve implementar qualquer função de escrita. ║
 * ║  Usar APENAS: spreadsheets.values.get e spreadsheets.get         ║
 * ║  Scope: https://www.googleapis.com/auth/spreadsheets.readonly    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { google } from 'googleapis'
import type { SheetInfo } from '@/types'

// Scope de leitura APENAS — nunca alterar para escrita
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'] as const

/**
 * Cria um cliente autenticado da API Google Sheets com permissão de LEITURA APENAS.
 * Usa a Service Account configurada via variáveis de ambiente.
 */
async function getSheetsClient() {
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY

  if (!privateKey) {
    throw new Error('GOOGLE_SA_PRIVATE_KEY não configurada')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email:
        process.env.GOOGLE_SA_EMAIL ??
        'orbe-sheets-sync@orbe-field.iam.gserviceaccount.com',
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  })

  return google.sheets({ version: 'v4', auth })
}

/**
 * Lê dados de um intervalo da planilha (somente leitura).
 *
 * @param sheetId - ID da planilha Google Sheets
 * @param range   - Intervalo no formato A1 ex: "Produtos!A1:Z1000" ou "A1:Z1000"
 * @returns Array de linhas, cada linha é um array de strings
 */
export async function readSheet(
  sheetId: string,
  range: string
): Promise<string[][]> {
  const sheets = await getSheetsClient()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: 'FORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  })

  return (response.data.values as string[][] | null | undefined) ?? []
}

/**
 * Lê os metadados da planilha (lista de abas, título, etc.) — somente leitura.
 *
 * @param sheetId - ID da planilha Google Sheets
 * @returns Informações da planilha incluindo abas disponíveis
 */
export async function getSheetMetadata(sheetId: string): Promise<SheetInfo> {
  const sheets = await getSheetsClient()

  const response = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'spreadsheetId,properties.title,sheets.properties',
  })

  const data = response.data

  return {
    sheetId: data.spreadsheetId ?? sheetId,
    title: data.properties?.title ?? 'Sem título',
    sheets:
      data.sheets?.map((s) => ({
        sheetId: s.properties?.sheetId ?? 0,
        title: s.properties?.title ?? '',
        index: s.properties?.index ?? 0,
        rowCount: s.properties?.gridProperties?.rowCount ?? 0,
        columnCount: s.properties?.gridProperties?.columnCount ?? 0,
      })) ?? [],
  }
}

/**
 * Converte letra de coluna para índice (0-based).
 * ex: "A" → 0, "B" → 1, "Z" → 25, "AA" → 26
 */
export function columnLetterToIndex(letter: string): number {
  letter = letter.toUpperCase()
  let result = 0
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64)
  }
  return result - 1
}

/**
 * Lê as linhas de dados de uma tabela de preço a partir das configurações do documento.
 * Mapeia colunas conforme o columnMap definido na price_table.
 *
 * @param sheetId      - ID da planilha
 * @param sheetName    - Nome da aba (ex: "Produtos")
 * @param dataStartRow - Linha onde começam os dados (1-based)
 * @param columnMap    - Mapeamento de letras de coluna para campos
 * @returns Array de linhas mapeadas + linha bruta
 */
export async function readPriceTableRows(
  sheetId: string,
  sheetName: string,
  dataStartRow: number,
  columnMap: {
    name: string
    description: string
    code: string
    price: string
    unit: string
  }
) {
  const range = `${sheetName}!A${dataStartRow}:Z10000`
  const rows = await readSheet(sheetId, range)

  const nameIdx = columnLetterToIndex(columnMap.name)
  const descIdx = columnLetterToIndex(columnMap.description)
  const codeIdx = columnLetterToIndex(columnMap.code)
  const priceIdx = columnLetterToIndex(columnMap.price)
  const unitIdx = columnLetterToIndex(columnMap.unit)

  return rows
    .filter((row) => row.some((cell) => cell?.trim()))  // remove linhas vazias
    .map((row, i) => ({
      rowIndex: dataStartRow + i,
      name: row[nameIdx] ?? '',
      description: row[descIdx] ?? '',
      code: row[codeIdx] ?? '',
      price: row[priceIdx] ?? '',
      unit: row[unitIdx] ?? '',
      rawRow: row,
    }))
}

// ─── FUNÇÕES PROIBIDAS (nunca implementar) ────────────────────────────────────
// writeSheet()    — PROIBIDO
// updateSheet()   — PROIBIDO
// clearSheet()    — PROIBIDO
// appendSheet()   — PROIBIDO
// deleteRows()    — PROIBIDO
// batchUpdate()   — PROIBIDO
