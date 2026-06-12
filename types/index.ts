import { Timestamp } from 'firebase/firestore'

// ─── Roles & Status ──────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'representante'
export type UserStatus = 'active' | 'inactive'
export type ImportStatus = 'pending' | 'success' | 'error'
export type FileType = 'pdf' | 'image' | 'doc'

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  uid: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  familyId: string        // ref para /families (representantes; admin: "" ou omitido)
  familyCode: string      // código ex: "4836"
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface UserCreateInput {
  name: string
  email: string
  password: string
  role: UserRole
  familyId?: string
  familyCode?: string
}

export interface UserUpdateInput {
  name?: string
  role?: UserRole
  status?: UserStatus
  familyId?: string
  familyCode?: string
}

// ─── Family ───────────────────────────────────────────────────────────────────

export interface Family {
  id: string
  name: string
  code: string
  createdAt: Timestamp
}

export interface FamilyCreateInput {
  name: string
  code: string
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  description: string
  familyId: string
  status: 'active' | 'inactive'
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ProductCreateInput {
  name: string
  description: string
  familyId: string
  status?: 'active' | 'inactive'
}

export interface ProductUpdateInput {
  name?: string
  description?: string
  familyId?: string
  status?: 'active' | 'inactive'
}

// ─── Product File ─────────────────────────────────────────────────────────────

export interface ProductFile {
  id: string
  productId: string
  fileName: string
  fileUrl: string         // Firebase Storage URL
  fileType: FileType
  fileSize: number        // bytes
  uploadedAt: Timestamp
}

// ─── Price Table ──────────────────────────────────────────────────────────────

export interface ColumnMap {
  name: string            // ex: "A"
  description: string     // ex: "B"
  code: string            // ex: "C"
  price: string           // ex: "D"
  unit: string            // ex: "E"
}

export interface ImportedRow {
  rowIndex: number
  name: string
  description: string
  code: string
  price: string
  unit: string
  rawRow: string[]
}

/**
 * Documento principal de price_table.
 * Os dados importados são salvos em subcoleção price_tables/{tableId}/rows/{rowId}
 * para evitar estouro do limite de 1 MB do Firestore.
 */
export interface PriceTable {
  id: string              // formato: "{familyCode}_{número}" ex: "4836_1001"
  familyId: string
  familyCode: string
  name: string
  sheetId: string         // ID da planilha Google Sheets
  sheetName: string       // nome da aba (default: primeira aba)
  headerRow: number       // linha do cabeçalho (default: 1)
  dataStartRow: number    // linha onde começam os dados (default: 2)
  columnMap: ColumnMap
  lastImportedAt: Timestamp | null
  importStatus: ImportStatus
  importError: string | null
  rowCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PriceTableCreateInput {
  familyId: string
  familyCode: string
  name: string
  sheetId: string
  sheetName?: string
  headerRow?: number
  dataStartRow?: number
  columnMap: ColumnMap
}

export interface PriceTableUpdateInput {
  name?: string
  sheetId?: string
  sheetName?: string
  headerRow?: number
  dataStartRow?: number
  columnMap?: Partial<ColumnMap>
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DISABLE_USER'
  | 'CREATE_FAMILY'
  | 'UPDATE_FAMILY'
  | 'DELETE_FAMILY'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'UPLOAD_FILE'
  | 'DELETE_FILE'
  | 'CREATE_PRICE_TABLE'
  | 'UPDATE_PRICE_TABLE'
  | 'DELETE_PRICE_TABLE'
  | 'IMPORT_SHEET'
  | 'DOWNLOAD_FILE'

export interface AuditLog {
  id: string
  userId: string
  userEmail: string
  action: AuditAction
  collection: string
  documentId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string
  createdAt: Timestamp
}

// ─── Share Log ────────────────────────────────────────────────────────────────

export interface ShareLog {
  id: string
  userId: string
  productId: string
  productName: string
  sharedWith: string      // email ou nome
  createdAt: Timestamp
}

// ─── Auth Context ─────────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  role: UserRole | null
  status: UserStatus | null
  familyId: string | null
  familyCode: string | null
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ─── Import Result ────────────────────────────────────────────────────────────

export interface ImportResult {
  tableId: string
  rowCount: number
  importedAt: string
  status: ImportStatus
  error?: string
}

// ─── Sheet Metadata ───────────────────────────────────────────────────────────

export interface SheetInfo {
  sheetId: string
  title: string
  sheets: Array<{
    sheetId: number
    title: string
    index: number
    rowCount: number
    columnCount: number
  }>
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalActiveUsers: number
  totalActiveProducts: number
  totalImportedTables: number
  lastImportAt: Timestamp | null
}
