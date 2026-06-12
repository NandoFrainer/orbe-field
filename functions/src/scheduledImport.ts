/**
 * Cloud Function agendada — importação diária às 6h horário de Brasília
 * Cron: "0 9 * * *" (UTC) = 6h BRT (UTC-3)
 *
 * Itera por todas as price_tables e importa cada uma.
 * Planilha é SOMENTE LEITURA.
 */

import * as functions from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import { importTableData } from './importSheet'
import type { PriceTableDoc } from './types'

export const scheduledSheetImport = functions.scheduler.onSchedule(
  {
    schedule: '0 9 * * *',          // 6h BRT (UTC-3)
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
    memory: '256MiB',
    timeoutSeconds: 540,             // 9 minutos
  },
  async () => {
    const db = admin.firestore()
    const tablesSnap = await db.collection('price_tables').get()

    console.log(`[scheduledImport] Iniciando importação de ${tablesSnap.size} tabela(s)`)

    const results: Array<{ tableId: string; rowCount?: number; error?: string }> = []

    for (const doc of tablesSnap.docs) {
      const table = { id: doc.id, ...doc.data() } as PriceTableDoc

      if (!table.sheetId) {
        console.warn(`[scheduledImport] Tabela ${table.id} sem sheetId — pulando`)
        continue
      }

      try {
        const rowCount = await importTableData({
          tableId: table.id,
          sheetId: table.sheetId,
          sheetName: table.sheetName || 'Produtos',
          dataStartRow: table.dataStartRow || 2,
          columnMap: table.columnMap,
        })
        console.log(`[scheduledImport] ${table.id}: ${rowCount} linhas importadas`)
        results.push({ tableId: table.id, rowCount })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error(`[scheduledImport] Erro ao importar ${table.id}: ${msg}`)
        results.push({ tableId: table.id, error: msg })
      }
    }

    const success = results.filter((r) => !r.error).length
    console.log(`[scheduledImport] Concluído: ${success}/${results.length} tabelas com sucesso`)
  }
)
