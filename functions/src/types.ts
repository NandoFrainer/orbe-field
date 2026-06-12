export interface ColumnMap {
  name: string
  description: string
  code: string
  price: string
  unit: string
}

export interface PriceTableDoc {
  id: string
  familyId: string
  familyCode: string
  name: string
  sheetId: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  columnMap: ColumnMap
  importStatus: 'pending' | 'success' | 'error'
  importError: string | null
  rowCount: number
}
