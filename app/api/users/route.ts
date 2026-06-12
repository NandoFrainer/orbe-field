/**
 * POST /api/users — Criar novo usuário via Firebase Admin SDK
 * GET  /api/users — Listar usuários (somente admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb, verifyIdToken } from '@/lib/firebase-admin'
import { createUserSchema } from '@/lib/validations/user'
import { FieldValue } from 'firebase-admin/firestore'

async function getRequestUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  try {
    const decoded = await verifyIdToken(token)
    const adminDb = getAdminDb()
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (!userDoc.exists) return null
    return { uid: decoded.uid, ...userDoc.data() } as {
      uid: string
      role: string
      status: string
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  // Autenticação
  const reqUser = await getRequestUser(request)
  if (!reqUser || reqUser.role !== 'admin' || reqUser.status !== 'active') {
    return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
  }

  // Parsing e validação
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => e.message).join(', ')
    return NextResponse.json({ success: false, error: errors }, { status: 400 })
  }

  const { name, email, password, role, familyId, familyCode } = parsed.data

  try {
    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()

    // Cria no Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    })

    // Cria documento no Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      role,
      status: 'active',
      familyId: familyId ?? '',
      familyCode: familyCode ?? '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Registra em audit_logs
    await adminDb.collection('audit_logs').add({
      userId: reqUser.uid,
      userEmail: (await adminAuth.getUser(reqUser.uid)).email ?? '',
      action: 'CREATE_USER',
      collection: 'users',
      documentId: userRecord.uid,
      before: null,
      after: { name, email, role, familyId, familyCode },
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      data: { uid: userRecord.uid },
      message: 'Usuário criado com sucesso',
    })
  } catch (err: unknown) {
    const message =
      typeof err === 'object' && err !== null && 'code' in err
        ? getFirebaseAuthErrorMessage((err as { code: string }).code)
        : 'Erro interno ao criar usuário'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function getFirebaseAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-exists': 'E-mail já está em uso.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'Senha muito fraca.',
  }
  return messages[code] ?? 'Erro ao criar usuário no Firebase Auth.'
}
