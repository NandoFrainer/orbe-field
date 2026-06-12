/**
 * POST /api/auth/session
 * Recebe o ID token do Firebase Auth, extrai o UID do JWT,
 * lê o documento do usuário via Firestore REST API + service account token
 * (bypassa gRPC e Firestore rules).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'

/** Decodifica o payload do JWT sem verificar assinatura */
function decodeJwtPayload(token: string): { uid?: string; sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

/** Lê documento do Firestore via REST usando token da service account */
async function fetchUserDocRest(uid: string): Promise<Record<string, unknown> | null> {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? 'orbe-field'

  // Obtém access token OAuth2 a partir da service account (sem gRPC)
  const adminApp = getAdminApp()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credential = (adminApp as any).options.credential
  const tokenResult: { access_token: string } = await credential.getAccessToken()
  const accessToken = tokenResult.access_token

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`
  console.log('[session] GET', url)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: controller.signal,
  })
  clearTimeout(timer)

  const body = await res.text()
  console.log('[session] status:', res.status, '| body:', body.substring(0, 200))

  if (!res.ok) return null
  return JSON.parse(body)
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'idToken ausente' }, { status: 400 })
    }

    const payload = decodeJwtPayload(idToken)
    if (!payload) {
      return NextResponse.json({ error: 'Token malformado.' }, { status: 400 })
    }

    const uid = payload.uid ?? payload.sub
    if (!uid) {
      return NextResponse.json({ error: 'UID não encontrado no token.' }, { status: 400 })
    }

    console.log('[session] uid:', uid, '| project:', process.env.FIREBASE_ADMIN_PROJECT_ID)

    const doc = await fetchUserDocRest(uid)

    if (!doc) {
      return NextResponse.json(
        { error: 'Usuário não encontrado no banco de dados.' },
        { status: 404 }
      )
    }

    const fields = (doc.fields ?? {}) as Record<string, { stringValue?: string }>
    const getString = (key: string) => fields[key]?.stringValue ?? null

    return NextResponse.json({
      uid,
      email: getString('email'),
      name: getString('name'),
      role: getString('role'),
      status: getString('status'),
      familyId: getString('familyId'),
      familyCode: getString('familyCode'),
    })
  } catch (err) {
    console.error('[/api/auth/session] erro:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
