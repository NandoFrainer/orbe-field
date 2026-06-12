import { redirect } from 'next/navigation'

/**
 * Rota raiz — o middleware redireciona para o dashboard correto,
 * mas adicionamos um fallback aqui para segurança.
 */
export default function RootPage() {
  redirect('/login')
}
