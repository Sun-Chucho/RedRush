const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
  console.log('Seeding riders and restaurants...');

  const dataToSeed = {
    riders: [
      { email: 'rider.kenya1@redrush.app', name: 'Juma K. (Kenya)', lat: -1.2921, lon: 36.8219 },
      { email: 'rider.kenya2@redrush.app', name: 'Ochieng P. (Kenya)', lat: -1.3000, lon: 36.8100 },
      { email: 'rider.tz1@redrush.app', name: 'Asha M. (Tanzania)', lat: -6.7924, lon: 39.2083 },
      { email: 'rider.tz2@redrush.app', name: 'Baraka J. (Tanzania)', lat: -6.8000, lon: 39.2100 }
    ],
    restaurants: [
      { email: 'resto.kenya1@redrush.app', name: 'Nairobi Grill', cuisine: 'Kenyan', lat: -1.2950, lon: 36.8250 },
      { email: 'resto.kenya2@redrush.app', name: 'Mombasa Seafood', cuisine: 'Seafood', lat: -1.2800, lon: 36.8300 },
      { email: 'resto.tz1@redrush.app', name: 'Dar Swahili Food', cuisine: 'Tanzanian', lat: -6.7800, lon: 39.2000 },
      { email: 'resto.tz2@redrush.app', name: 'Zanzibar Spice', cuisine: 'Spicy', lat: -6.8100, lon: 39.2200 }
    ]
  };

  // Create Riders
  for (const r of dataToSeed.riders) {
    // 1. Create User
    const { data: user, error: userErr } = await supabase.auth.admin.createUser({
      email: r.email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { name: r.name, role: 'rider' }
    });
    
    if (userErr && !userErr.message.includes('already registered')) {
      console.error('Error creating rider auth:', userErr);
      continue;
    }

    const userId = user?.user?.id;
    if (!userId) continue;

    // 2. Update profile
    await supabase.from('profiles').update({
      role: 'rider',
      status: 'active'
    }).eq('id', userId);

    // 3. Upsert rider location (Offline)
    await supabase.from('rider_locations').upsert({
      rider_id: userId,
      latitude: r.lat,
      longitude: r.lon,
      is_online: false,
      last_updated: new Date().toISOString()
    });
    
    console.log(`Created rider: ${r.name}`);
  }

  // Create Restaurants
  for (const res of dataToSeed.restaurants) {
    // 1. Create User
    const { data: user, error: userErr } = await supabase.auth.admin.createUser({
      email: res.email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { name: res.name + ' Owner', role: 'vendor' }
    });

    if (userErr && !userErr.message.includes('already registered')) {
      console.error('Error creating restaurant auth:', userErr);
      continue;
    }

    const userId = user?.user?.id;
    if (!userId) continue;

    // 2. Update Profile
    await supabase.from('profiles').update({
      role: 'vendor',
      status: 'active'
    }).eq('id', userId);

    // 3. Check if restaurant exists
    const { data: existing } = await supabase.from('restaurants').select('id').eq('owner_id', userId).single();
    if (!existing) {
       await supabase.from('restaurants').insert({
         owner_id: userId,
         name: res.name,
         cuisine: res.cuisine,
         latitude: res.lat,
         longitude: res.lon,
         is_open: false,
         address: `${res.name} Street`,
         delivery_time: '30-45 min',
         delivery_fee: 500,
         min_order: 1000
       });
       console.log(`Created restaurant: ${res.name}`);
    } else {
       await supabase.from('restaurants').update({
         is_open: false,
         latitude: res.lat,
         longitude: res.lon
       }).eq('id', existing.id);
       console.log(`Updated restaurant: ${res.name}`);
    }
  }

  console.log('Seed complete!');
}

seed().catch(console.error);
