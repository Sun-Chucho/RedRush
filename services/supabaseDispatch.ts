import { supabase } from './supabase';

export type DispatchRider = {
  id: string;
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  totalDeliveries: number;
};

export async function fetchOnlineRiders(): Promise<DispatchRider[]> {
  const freshAfter = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: locations, error: locError } = await supabase
    .from('rider_locations')
    .select('*')
    .eq('is_online', true)
    .gte('updated_at', freshAfter);

  if (locError || !locations) return [];

  const riderIds = locations.map(l => l.rider_id);
  if (riderIds.length === 0) return [];

  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, name, phone')
    .in('id', riderIds);

  const { data: settings } = await supabase
    .from('rider_profiles')
    .select('user_id, total_deliveries')
    .in('user_id', riderIds);

  return locations.map(loc => {
    const profile = profiles?.find(p => p.id === loc.rider_id);
    const setting = settings?.find(s => s.user_id === loc.rider_id);

    return {
      id: loc.rider_id,
      name: profile?.name || 'Unknown Rider',
      phone: profile?.phone || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      isOnline: loc.is_online,
      totalDeliveries: setting?.total_deliveries || 0,
    };
  });
}

export async function assignRiderToOrder(orderId: string, riderId: string, riderName: string): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({
      rider_id: riderId,
      rider_name: riderName,
      status: 'assigned',
    })
    .eq('id', orderId);

  if (error) throw error;
  return true;
}
