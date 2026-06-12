import { z } from 'zod'

export const importSheetSchema = z.object({
  tableId: z.string().optional(),
  importAll: z.boolean().optional(),
})

export const createPriceTableSchema = z.object({
  familyId: z.string().min(1),
  familyCode: z.string().min(1),
  name: z.string().min(1).max(100),
  sheetId: z.string().min(1),
  sheetName: z.string().default('Produtos'),
  headerRow: z.number().int().min(1).default(1),
  dataStartRow: z.number().int().min(1).default(2),
  columnMap: z.object({
    name: z.string().length(1),
    description: z.string().length(1),
    code: z.string().length(1),
    price: z.string().length(1),
    unit: z.string().length(1),
  }),
})

export type ImportSheetInput = z.infer<typeof importSheetSchema>
export type CreatePriceTableInput = z.infer<typeof createPriceTableSchema>
