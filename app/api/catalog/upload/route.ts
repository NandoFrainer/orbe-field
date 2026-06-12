/**
 * POST /api/catalog/upload
 * Recebe multipart/form-data: file, cod, name, type
 * Faz upload para Firebase Storage e registra metadados no Firestore.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin'
import { getStorage } from 'firebase-admin/storage'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file  = formData.get('file')  as File | null
    const cod   = formData.get('cod')   as string | null
    const name  = formData.get('name')  as string | null
    const type  = formData.get('type')  as string | null

    if (!file || !cod || !name) {
      return NextResponse.json({ error: 'file, cod e name obrigatórios' }, { status: 400 })
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext    = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const safeName = name.replace(/[^a-zA-Z0-9_\-.]/g, '_')
    const storagePath = `catalog/${cod}/${type ?? 'outro'}/${safeName}.${ext}`

    // Upload para Firebase Storage
    const adminApp = getAdminApp()
    const bucketName =
      process.env.FIREBASE_ADMIN_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      'orbe-field.firebasestorage.app'
    const bucket = getStorage(adminApp).bucket(bucketName)

    console.log('[upload] bucket:', bucket.name, '| path:', storagePath, '| size:', buffer.length)

    const fileRef = bucket.file(storagePath)

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
      },
      resumable: false,  // desabilita upload resumável (desnecessário para arquivos pequenos)
    })

    // Gera URL pública com assinatura de 10 anos
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
    })

    // Registra no Firestore
    const db = getAdminDb()
    const ref = await db.collection('catalog_files').add({
      cod,
      name,
      type: type ?? 'outro',
      url: signedUrl,
      storageRef: storagePath,
      uploadedAt: new Date().toISOString(),
    })

    return NextResponse.json({ id: ref.id, url: signedUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/catalog/upload] erro:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
