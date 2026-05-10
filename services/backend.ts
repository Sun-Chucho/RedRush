/**
 * Backend service — Supabase-only.
 * All Firebase/Firestore logic removed.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { requestRoleOnSupabase, reviewRoleRequestOnSupabase } from './supabaseRoles';

export type RoleRequestRole = 'vendor' | 'rider';
export type RoleRequestDecision = 'approved' | 'rejected';

export interface CreateOrderInput {
  restaurantId: string;
  address: string;
  paymentMethod: string;
  promoCode?: string;
  items: { menuItemId: string; quantity: number }[];
}

/**
 * Register a push token so the server can deliver remote notifications.
 */
export async function registerPushTokenOnBackend(token: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return;

  // Store push token in profiles (extend schema if needed)
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', authData.user.id)
    .catch(() => undefined);
}

/**
 * Request a role upgrade (vendor/rider). Stored in Supabase role_requests table.
 */
export async function requestRoleOnBackend(role: RoleRequestRole, notes?: string): Promise<void> {
  const ok = await requestRoleOnSupabase(role, notes);
  if (!ok) throw new Error('Unable to submit role request. Please try again.');
}

/**
 * Admin: approve or reject a role request.
 */
export async function reviewRoleRequestOnBackend(
  userId: string,
  decision: RoleRequestDecision
): Promise<void> {
  const ok = await reviewRoleRequestOnSupabase(userId, decision);
  if (!ok) throw new Error('Unable to process role request.');
}
