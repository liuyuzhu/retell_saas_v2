/**
 * validation.ts
 * Centralized Zod schemas for all API inputs.
 * Use schema.safeParse(body) in route handlers instead of manual if-checks.
 */

import { z } from 'zod';

// ─── Common ──────────────────────────────────────────────────────────────────

const email = z.string().email('Invalid email format.').toLowerCase();

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
});

export const RegisterSchema = z.object({
  email,
  password,
  name: z.string().max(128).optional(),
  phone: z.string().max(20).optional(),
});

export const ForgotPasswordSchema = z.object({
  email,
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  password,
});

// ─── Admin user management schemas ───────────────────────────────────────────

export const CreateUserSchema = z.object({
  email,
  password,
  name: z.string().max(128).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(['user', 'admin']).default('user'),
  agentIds: z.array(z.string()).optional(),
  phoneNumbers: z.array(z.string()).optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().max(128).optional(),
  phone: z.string().max(20).optional(),
  is_active: z.boolean().optional(),
  role: z.enum(['user', 'admin']).optional(),
  agentIds: z.array(z.string()).optional(),
  phoneNumbers: z.array(z.string()).optional(),
});

// ─── Config schemas ───────────────────────────────────────────────────────────

export const UpdateConfigsSchema = z.object({
  configs: z.array(
    z.object({
      config_key: z.string().min(1),
      config_value: z.string(),
    })
  ),
});

export const CreateConfigSchema = z.object({
  config_key: z.string().min(1, 'config_key is required.'),
  config_value: z.string().default(''),
  description: z.string().default(''),
  category: z.string().default('general'),
  is_public: z.boolean().default(false),
});

// ─── Call schemas ─────────────────────────────────────────────────────────────

export const CreateCallSchema = z.object({
  agent_id: z.string().min(1, 'agent_id is required.'),
  call_type: z.enum(['web_call', 'phone_call']).optional(),
  from_number: z.string().optional(),
  to_number: z.string().optional(),
  language: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  retell_llm_dynamic_variables: z.record(z.string(), z.unknown()).optional(),
});

// ─── Sync schemas ────────────────────────────────────────────────────────────

export const SyncCallsSchema = z.object({
  userId: z.string().uuid().optional(),
  agentId: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  syncAll: z.boolean().default(false),
});

// ─── Setup schemas ────────────────────────────────────────────────────────────

export const SetupPrimarySchema = z.object({
  setupSecret: z.string().min(1, 'setupSecret is required.'),
  email: z.string().email().optional(),
  password: password.optional(),
  name: z.string().max(128).optional(),
});
