/**
 * Middleware Next.js — Proteção de rotas
 *
 * Fluxo:
 *  1. Rota pública (/login, /blocked) → passa sem verificação
 *  2. Token ausente ou inválido → redireciona para /login
 *  3. Usuário inativo → redireciona para /blocked
 *  4. Rota /admin/* + role != "admin" → redireciona para /rep/dashboard
 *  5. Rota /rep/*   + role != representante/admin → redireciona para /login
 *
 * NOTA: A verificação completa de token Firebase (Admin SDK) só ocorre nas
 * API routes. O middleware usa o cookie de sessão para decisões de roteamento
 * rápido. A validação criptográfica real acontece em cada API route.
 */

import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas — sem verificação de auth
const PUBLIC_PATHS = ['/login', '/blocked', '/api/auth']

// Rotas de admin
const ADMIN_PATHS = ['/admin']

// Rotas de representante
const REP_PATHS = ['/rep']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas estáticas e de API de auth passam direto
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    isPublicPath(pathname)
  ) {
    return NextResponse.next()
  }

  // Lê o cookie de sessão que o cliente escreve após login
  const sessionCookie = request.cookies.get('orbe-session')
  const sessionData = sessionCookie?.value

  if (!sessionData) {
    // Sem sessão → redireciona para login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Decodifica os dados básicos da sessão (role e status)
  // O token completo é validado pelo Admin SDK em cada API route
  let role: string | null = null
  let status: string | null = null

  try {
    const decoded = JSON.parse(atob(sessionData))
    role = decoded.role ?? null
    status = decoded.status ?? null

    // Checar expiração da sessão (8 horas)
    const loginTime = decoded.loginTime ?? 0
    const eightHours = 8 * 60 * 60 * 1000
    if (Date.now() - loginTime > eightHours) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('orbe-session')
      return response
    }
  } catch {
    // Cookie corrompido → limpa e redireciona para login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('orbe-session')
    return response
  }

  // Usuário inativo → redireciona para /blocked
  if (status === 'inactive') {
    return NextResponse.redirect(new URL('/blocked', request.url))
  }

  // Proteção das rotas de admin
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/rep/dashboard', request.url))
    }
  }

  // Proteção das rotas de rep
  if (REP_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== 'representante' && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Rota raiz → redireciona para o dashboard correto
  if (pathname === '/') {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/rep/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Aplica middleware em todas as rotas EXCETO:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
