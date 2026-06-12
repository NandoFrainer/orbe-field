/**
 * Firebase Cloud Functions — Orbe Field
 * Node.js 20, região southamerica-east1
 */

import * as admin from 'firebase-admin'

// Inicializa o Admin SDK uma vez
if (admin.apps.length === 0) {
  admin.initializeApp()
}

// Exporta as funções
export { scheduledSheetImport } from './scheduledImport'
