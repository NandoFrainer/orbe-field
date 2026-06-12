'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? ''

  const { user, loading, signInWithEmail, signInWithGoogle, resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Redireciona após login bem-sucedido
  useEffect(() => {
    if (!loading && user) {
      if (user.status === 'inactive') {
        router.replace('/blocked')
        return
      }
      const dest =
        redirect ||
        (user.role === 'admin' ? '/admin/dashboard' : '/rep/dashboard')
      router.replace(dest)
    }
  }, [user, loading, router, redirect])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signInWithEmail(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setIsSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    try {
      await resetPassword(resetEmail)
      setResetSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4" suppressHydrationWarning>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm"
      >
        {/* Logo / Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0071E3] mb-4 shadow-apple-md">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1D1D1F]">Orbe Field</h1>
          <p className="text-sm text-[#6E6E73] mt-1">Área de representantes</p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-apple-md p-8">
          <AnimatePresence mode="wait">
            {!showReset ? (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  {/* Campo email */}
                  <div className="relative">
                    <label
                      htmlFor="email"
                      className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        email
                          ? 'top-2 text-xs text-[#6E6E73]'
                          : 'top-1/2 -translate-y-1/2 text-sm text-[#6E6E73]'
                      }`}
                    >
                      E-mail
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className={`w-full bg-gray-50 border-0 rounded-xl px-4 text-sm text-[#1D1D1F]
                        focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:bg-white
                        transition-all duration-150 ${email ? 'pt-6 pb-2' : 'py-4'}`}
                    />
                  </div>

                  {/* Campo senha */}
                  <div className="relative">
                    <label
                      htmlFor="password"
                      className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        password
                          ? 'top-2 text-xs text-[#6E6E73]'
                          : 'top-1/2 -translate-y-1/2 text-sm text-[#6E6E73]'
                      }`}
                    >
                      Senha
                    </label>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className={`w-full bg-gray-50 border-0 rounded-xl px-4 pr-12 text-sm text-[#1D1D1F]
                        focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:bg-white
                        transition-all duration-150 ${password ? 'pt-6 pb-2' : 'py-4'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E73]
                        hover:text-[#3A3A3C] transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Erro inline */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-[#FF3B30] text-sm bg-red-50 rounded-xl px-4 py-3"
                      >
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Botão entrar */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#0071E3] text-white rounded-xl py-3 text-sm font-medium
                      hover:bg-[#0077ED] active:bg-[#006BD6] transition-colors duration-150
                      shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Entrando…
                      </span>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </form>

                {/* Divisor */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-[#6E6E73]">ou</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Botão Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200
                    rounded-xl py-3 text-sm font-medium text-[#3A3A3C] hover:bg-gray-50
                    active:bg-gray-100 transition-colors duration-150 shadow-sm
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {/* Ícone Google SVG */}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continuar com Google
                </button>

                {/* Link esqueci senha */}
                <div className="text-center mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReset(true)
                      setError(null)
                      setResetEmail(email)
                    }}
                    className="text-sm text-[#0071E3] hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Formulário de reset de senha */
              <motion.div
                key="reset"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-[#1D1D1F]">
                    Redefinir senha
                  </h2>
                  <p className="text-sm text-[#6E6E73] mt-1">
                    Informe seu e-mail e enviaremos um link de redefinição.
                  </p>
                </div>

                {resetSent ? (
                  <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                    <span>✓</span>
                    <span>
                      E-mail enviado! Verifique sua caixa de entrada.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="input-apple"
                    />

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 text-[#FF3B30] text-sm bg-red-50 rounded-xl px-4 py-3"
                        >
                          <AlertCircle size={15} />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full bg-[#0071E3] text-white rounded-xl py-3 text-sm font-medium
                        hover:bg-[#0077ED] transition-colors disabled:opacity-60"
                    >
                      {resetLoading ? 'Enviando…' : 'Enviar link'}
                    </button>
                  </form>
                )}

                <div className="text-center mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReset(false)
                      setResetSent(false)
                      setError(null)
                    }}
                    className="text-sm text-[#0071E3] hover:underline"
                  >
                    ← Voltar ao login
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F7]" />}>
      <LoginContent />
    </Suspense>
  )
}
