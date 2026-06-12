/**
 * PUT  /api/users/[uid] — Atualizar usuário
 * DELETE /api/users/[uid] — Desativar usuário
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb, verifyIdToken } from '@/lib/firebase-admin'
import { updateUserSchema } from '@/lib/validations/user'
import { FieldValue } from 'firebase-admin/firestore'

async function getRequestUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = await verifyIdToken(token)
    const doc = await getAdminDb().collection('users').doc(decoded.uid).get()
    if (!doc.exists) return null
    return { uid: decoded.uid, ...doc.data() } as { uid: string; role: string; status: string }
  } catch {
    return null
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  const reqUser = await getRequestUser(request)
  if (!reqUser || reqUser.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
  }

  const adminDb = getAdminDb()
  const userRef = adminDb.collection('users').doc(params.uid)
  const beforeDoc = await userRef.get()
  if (!beforeDoc.exists) {
    return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 })
  }

  await userRef.update({
    ...parsed.data,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await adminDb.collection('audit_logs').add({
    userId: reqUser.uid,
    userEmail: (await getAdminAuth().getUser(reqUser.uid)).email ?? '',
    action: 'UPDATE_USER',
    collection: 'users',
    documentId: params.uid,
    before: beforeDoc.data() ?? null,
    after: parsed.data,
    ip: request.headers.get('x-forwarded-for') ?? 'unknown',
    createdAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ success: true, message: 'Usuário atualizado' })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  const reqUser = await getRequestUser(request)
  if (!reqUser || reqUser.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
  }

  const adminDb = getAdminDb()
  await adminDb.collection('users').doc(params.uid).update({
    status: 'inactive',
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Revoga tokens do usuário
  try {
    await getAdminAuth().revokeRefreshTokens(params.uid)
  } catch { /* segue */ }

  await adminDb.collection('audit_logs').add({
    userId: reqUser.uid,
    userEmail: (await getAdminAuth().getUser(reqUser.uid)).email ?? '',
    action: 'DISABLE_USER',
    collection: 'users',
    documentId: params.uid,
    before: null,
    after: { status: 'inactive' },
    ip: request.headers.get('x-forwarded-for') ?? 'unknown',
    createdAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ success: true, message: 'Usuário desativado' })
}
