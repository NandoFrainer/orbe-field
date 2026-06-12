import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(80),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Deve conter ao menos um número'),
  role: z.enum(['admin', 'representante']),
  familyId: z.string().optional(),
  familyCode: z.string().optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum(['admin', 'representante']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  familyId: z.string().optional(),
  familyCode: z.string().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
