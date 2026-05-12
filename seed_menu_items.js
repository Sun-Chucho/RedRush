const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Fetching restaurants...');
  const { data: restaurants } = await supabase.from('restaurants').select('id, name, cuisine');

  if (!restaurants || restaurants.length === 0) {
    console.log('No restaurants found!');
    return;
  }

  const menuItems = [];

  for (const r of restaurants) {
    const items = [
      {
        restaurant_id: r.id,
        name: `Classic ${r.cuisine} Burger`,
        description: 'Juicy patty with fresh lettuce and secret sauce.',
        price: 1500,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
        category: 'Mains',
        available: true,
        preparation_time: 15
      },
      {
        restaurant_id: r.id,
        name: `Spicy ${r.name} Wings`,
        description: 'Crispy wings tossed in our signature hot sauce.',
        price: 2500,
        image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=500&q=80',
        category: 'Appetizers',
        available: true,
        preparation_time: 20
      },
      {
        restaurant_id: r.id,
        name: 'Fresh Garden Salad',
        description: 'Locally sourced greens with house vinaigrette.',
        price: 1200,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80',
        category: 'Healthy',
        available: true,
        preparation_time: 10
      },
      {
        restaurant_id: r.id,
        name: 'Chilled Soda',
        description: 'Refreshing cold beverage.',
        price: 500,
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
        category: 'Drinks',
        available: true,
        preparation_time: 5
      }
    ];
    
    menuItems.push(...items);
  }

  console.log(`Inserting ${menuItems.length} menu items...`);
  const { error } = await supabase.from('menu_items').insert(menuItems);

  if (error) {
    console.error('Error inserting menu items:', error);
  } else {
    console.log('Successfully seeded menu items!');
  }
}

seed().catch(console.error);
