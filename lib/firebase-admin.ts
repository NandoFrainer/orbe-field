/**
 * Firebase Admin SDK — uso EXCLUSIVO em server-side (API routes, middleware)
 * NUNCA importar em componentes client-side
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (!privateKey) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY não configurada')
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? 'orbe-field',
      clientEmail:
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL ??
        'orbe-sheets-sync@orbe-field.iam.gserviceaccount.com',
      // A variável de ambiente usa \\n literal; converter para \n real
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    storageBucket:
      process.env.FIREBASE_ADMIN_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      'orbe-field.firebasestorage.app',
  })
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}

// Cache para aplicar settings apenas uma vez (antes de qualquer operação)
let _adminDb: Firestore | null = null

export function getAdminDb(): Firestore {
  if (!_adminDb) {
    _adminDb = getFirestore(getAdminApp())
    // Força HTTP/REST em vez de gRPC — resolve falhas de conectividade local
    _adminDb.settings({ preferRest: true })
  }
  return _adminDb
}

/**
 * Verifica o token JWT Firebase e retorna os claims do usuário.
 * Lança erro se o token for inválido ou expirado.
 */
export async function verifyIdToken(token: string) {
  const adminAuth = getAdminAuth()
  return adminAuth.verifyIdToken(token)
}

/**
 * Busca o documento /users/{uid} do Firestore via Admin SDK.
 * Retorna null se não existir.
 */
export async function getUserDoc(uid: string) {
  const adminDb = getAdminDb()
  const snap = await adminDb.collection('users').doc(uid).get()
  if (!snap.exists) return null
  return snap.data() as import('@/types').User
}
