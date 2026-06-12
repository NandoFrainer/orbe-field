'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { AuthUser, UserRole, UserStatus } from '@/types'

interface UseAuthReturn {
  user: AuthUser | null
  loading: boolean
  error: string | null
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

function buildSessionCookie(role: UserRole, status: UserStatus, uid: string): string {
  const payload = { role, status, uid, loginTime: Date.now() }
  return btoa(JSON.stringify(payload))
}

function clearSessionCookie() {
  document.cookie = 'orbe-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

/** Lê o documento do usuário via API route (Admin SDK — ignora Firestore rules) */
async function loadUserData(firebaseUser: FirebaseUser): Promise<AuthUser | null> {
  try {
    const idToken = await firebaseUser.getIdToken()
    console.log('[useAuth] chamando /api/auth/session, uid:', firebaseUser.uid)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    const bodyText = await res.text()
    console.log('[useAuth] /api/auth/session status:', res.status)
    console.log('[useAuth] /api/auth/session body:', bodyText.substring(0, 300))

    if (!res.ok) {
      console.error('[useAuth] session API erro:', res.status, bodyText)
      clearSessionCookie()
      return null
    }

    const data = JSON.parse(bodyText)
    const role = data.role as UserRole
    const status = data.status as UserStatus

    // Define cookie de sessão para o middleware
    document.cookie = `orbe-session=${buildSessionCookie(
      role,
      status,
      firebaseUser.uid
    )}; path=/; max-age=${8 * 60 * 60}; SameSite=Strict`

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: data.name ?? firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      role,
      status,
      familyId: data.familyId ?? null,
      familyCode: data.familyCode ?? null,
    }
  } catch (err) {
    console.error('[useAuth] Erro ao carregar usuário:', err)
    clearSessionCookie()
    return null
  }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const authUser = await loadUserData(firebaseUser)
          setUser(authUser)
        } else {
          setUser(null)
          clearSessionCookie()
        }
      } catch (err) {
        console.error('[useAuth] onAuthStateChanged erro:', err)
        setUser(null)
        clearSessionCookie()
      } finally {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      const message = getFirebaseErrorMessage(err)
      setError(message)
      throw new Error(message)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err: unknown) {
      const message = getFirebaseErrorMessage(err)
      setError(message)
      throw new Error(message)
    }
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    clearSessionCookie()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err: unknown) {
      const message = getFirebaseErrorMessage(err)
      setError(message)
      throw new Error(message)
    }
  }, [])

  return { user, loading, error, signInWithEmail, signInWithGoogle, signOut, resetPassword }
}

function getFirebaseErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: string }).code
    const messages: Record<string, string> = {
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/user-disabled': 'Esta conta foi desativada.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
      'auth/popup-closed-by-user': 'Login cancelado.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
    }
    return messages[code] ?? 'Erro ao entrar. Tente novamente.'
  }
  return 'Erro inesperado. Tente novamente.'
}
