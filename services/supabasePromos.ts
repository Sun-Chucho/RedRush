import { isSupabaseConfigured, supabase } from './supabase';

export interface ValidatedPromo {
  code: string;
  title: string;
  discountPercent: number;
}

export async function validatePromoForCustomer(code: string, subtotal: number): Promise<ValidatedPromo> {
  if (!isSupabaseConfigured) throw new Error('Promotions are temporarily unavailable.');
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new Error('Enter a promo code.');

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Sign in to use a promo code.');

  const { data: promo, error } = await supabase.from('promo_codes')
    .select('code, title, discount_percent, min_order, max_uses, current_uses, expires_at')
    .eq('code', normalized).eq('is_active', true).maybeSingle();
  if (error || !promo) throw new Error('This promo code is invalid or inactive.');
  if (promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now()) throw new Error('This promo code has expired.');
  if (promo.max_uses != null && promo.current_uses >= promo.max_uses) throw new Error('This promo code has reached its usage limit.');
  if (subtotal < Number(promo.min_order || 0)) throw new Error('Your subtotal does not meet this promo’s minimum order.');

  const { data: redemption, error: redemptionError } = await supabase.from('promo_redemptions')
    .select('id').eq('user_id', userData.user.id).eq('promo_code', normalized).maybeSingle();
  if (redemptionError) throw new Error('Unable to verify this promo right now.');
  if (redemption) throw new Error('You have already used this promo code.');

  return { code: promo.code, title: promo.title, discountPercent: promo.discount_percent };
}
