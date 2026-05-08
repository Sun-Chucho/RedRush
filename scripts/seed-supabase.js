const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const RESTAURANTS = [
  {
    name: 'Chicken Republic',
    cuisine: 'Fast Food',
    rating: 4.8,
    reviewCount: 2341,
    deliveryTime: '20-35 min',
    deliveryFee: 500,
    minOrder: 2000,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
    address: '12 Allen Avenue, Ikeja',
    isOpen: true,
    distance: '1.2 km',
    promo: '20% OFF',
    categories: ['Burgers', 'Chicken', 'Sides', 'Drinks'],
    menu: [
      { name: 'Mighty Burger', description: 'Double beef patty with special sauce, lettuce, tomato', price: 4500, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80', category: 'Burgers', available: true, preparationTime: 15 },
      { name: 'Spicy Chicken Wings', description: '6 pieces of crispy spicy wings', price: 3200, image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=300&q=80', category: 'Chicken', available: true, preparationTime: 20 },
      { name: 'Jollof Rice Combo', description: 'Jollof rice with fried chicken and coleslaw', price: 2800, image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&q=80', category: 'Sides', available: true, preparationTime: 10 },
    ],
  },
  {
    name: 'Mama Put Kitchen',
    cuisine: 'Nigerian',
    rating: 4.6,
    reviewCount: 1823,
    deliveryTime: '30-45 min',
    deliveryFee: 300,
    minOrder: 1500,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    address: '5 Broad Street, Lagos Island',
    isOpen: true,
    distance: '0.8 km',
    categories: ['Rice', 'Soups', 'Swallows', 'Protein'],
    menu: [
      { name: 'Egusi Soup + Eba', description: 'Rich egusi soup with stockfish and assorted meat', price: 2200, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80', category: 'Soups', available: true, preparationTime: 10 },
      { name: 'Fried Rice & Chicken', description: 'Nigerian-style fried rice with grilled chicken', price: 2500, image: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=300&q=80', category: 'Rice', available: true, preparationTime: 15 },
    ],
  },
  {
    name: 'Pizza Palace',
    cuisine: 'Italian',
    rating: 4.5,
    reviewCount: 987,
    deliveryTime: '25-40 min',
    deliveryFee: 600,
    minOrder: 3500,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
    address: '23 Victoria Island',
    isOpen: true,
    distance: '2.1 km',
    promo: 'Free Drink',
    categories: ['Pizzas', 'Pasta', 'Salads', 'Desserts'],
    menu: [
      { name: 'Pepperoni Supreme', description: '12" pizza with extra pepperoni and mozzarella', price: 6500, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80', category: 'Pizzas', available: true, preparationTime: 25 },
      { name: 'Margherita Classic', description: 'Fresh tomato sauce, mozzarella, basil', price: 5000, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=80', category: 'Pizzas', available: true, preparationTime: 20 },
    ],
  },
];

if (!url) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Pass it only at runtime; do not commit it.');
  process.exit(1);
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function request(path, options) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return body;
}

function restaurantPayload(restaurant) {
  return {
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating,
    review_count: restaurant.reviewCount,
    delivery_time: restaurant.deliveryTime,
    delivery_fee: restaurant.deliveryFee,
    min_order: restaurant.minOrder,
    image: restaurant.image,
    cover_image: restaurant.coverImage,
    address: restaurant.address,
    is_open: restaurant.isOpen,
    distance: restaurant.distance,
    promo: restaurant.promo || null,
    categories: restaurant.categories,
  };
}

function menuPayload(restaurantId, item) {
  return {
    restaurant_id: restaurantId,
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    category: item.category,
    available: item.available,
    preparation_time: item.preparationTime,
  };
}

async function main() {
  for (const restaurant of RESTAURANTS) {
    const existing = await request(`restaurants?name=eq.${encodeURIComponent(restaurant.name)}&select=id`, {
      method: 'GET',
    });

    const restaurantRows = existing.length
      ? await request(`restaurants?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify(restaurantPayload(restaurant)),
        })
      : await request('restaurants', {
          method: 'POST',
          body: JSON.stringify(restaurantPayload(restaurant)),
        });

    const restaurantId = restaurantRows[0].id;

    await request(`menu_items?restaurant_id=eq.${restaurantId}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });

    await request('menu_items', {
      method: 'POST',
      body: JSON.stringify(restaurant.menu.map(item => menuPayload(restaurantId, item))),
    });
  }

  console.log('Seeded Supabase restaurants and menu items.');
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
