import { UserRole } from '@/constants/mockData';
import type { RoleRequestDecision, RoleRequestRole } from './backend';
import { isSupabaseConfigured, supabase } from './supabase';

export type SupabaseAdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  joined: string;
  orders: number;
};

export type SupabaseRoleRequest = {
  id: string;
  userName: string;
  email: string;
  requestedRole: UserRole;
  status: string;
};

async function getSupabaseUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export async function requestRoleOnSupabase(role: RoleRequestRole, notes?: string) {
  if (!isSupabaseConfigured) return false;

  const userId = await getSupabaseUserId();
  if (!userId) return false;

  const { error } = await supabase.from('role_requests').insert({
    user_id: userId,
    requested_role: role,
    notes: notes || '',
  });

  if (
    error &&
    (
      error.code === '23505' ||
      error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('unique')
    )
  ) {
    return true;
  }

  if (error) throw error;
  return true;
}

export async function reviewRoleRequestOnSupabase(requestId: string, decision: RoleRequestDecision) {
  if (!isSupabaseConfigured) return false;

  const { data: request, error: requestError } = await supabase
    .from('role_requests')
    .select('id, user_id, requested_role')
    .eq('id', requestId)
    .single();

  if (requestError) return false;

  const { error: updateRequestError } = await supabase
    .from('role_requests')
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateRequestError) throw updateRequestError;

  if (decision === 'approved') {
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ role: request.requested_role, status: 'active' })
      .eq('id', request.user_id);

    if (updateProfileError) throw updateProfileError;

    const profileTable = request.requested_role === 'vendor' ? 'vendor_profiles' : 'rider_profiles';
    const { error: approvalError } = await supabase
      .from(profileTable)
      .update({ approval_status: 'approved' })
      .eq('user_id', request.user_id);

    if (approvalError) throw approvalError;
  } else {
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', request.user_id);

    if (updateProfileError) throw updateProfileError;
  }

  return true;
}

export async function fetchSupabaseAdminUsers() {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, status, created_at')
    .order('created_at', { ascending: false });

  if (error) return null;

  return (data || []).map(profile => ({
    id: profile.id,
    name: profile.name || 'Unnamed user',
    email: profile.email || '',
    role: profile.role || 'customer',
    status: profile.status || 'active',
    joined: profile.created_at
      ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      : 'New',
    orders: 0,
  })) as SupabaseAdminUser[];
}

export async function updateSupabaseUserStatus(
  userId: string,
  status: 'active' | 'suspended' | 'banned'
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Backend not connected.');
  const { error } = await supabase.rpc('admin_set_profile_status', {
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

export async function fetchSupabaseRoleRequests() {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('role_requests')
    .select('id, requested_role, status, profiles:user_id(name, email)')
    .order('created_at', { ascending: false });

  if (error) return null;

  return (data || []).map(request => {
    const profile = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;

    return {
      id: request.id,
      userName: profile?.name || 'Unnamed user',
      email: profile?.email || '',
      requestedRole: request.requested_role || 'vendor',
      status: request.status || 'pending',
    };
  }) as SupabaseRoleRequest[];
}
