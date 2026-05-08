const { execSync } = require('child_process');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'redrush-ebc04';
const RESTAURANT_ID = process.env.REDRUSH_SEED_RESTAURANT_ID || 'redrush-demo-kitchen';
const OWNER_ID = process.env.REDRUSH_SEED_OWNER_ID || 'u86eAnbdmLPIASfQsnIks2a5smR2';

function getFirebaseToken() {
  const raw = execSync('firebase login:list --json', { encoding: 'utf8', shell: true });
  const parsed = JSON.parse(raw);
  const token = parsed.result?.[0]?.tokens?.access_token;
  if (!token) throw new Error('No Firebase CLI access token found. Run `firebase login` first.');
  return token;
}

function stringValue(value) {
  return { stringValue: value };
}

function doubleValue(value) {
  return { doubleValue: value };
}

function integerValue(value) {
  return { integerValue: String(value) };
}

function boolValue(value) {
  return { booleanValue: value };
}

function arrayValue(values) {
  return { arrayValue: { values: values.map(stringValue) } };
}

function timestampValue(date = new Date()) {
  return { timestampValue: date.toISOString() };
}

async function patchDoc(token, path, fields) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Failed to write ${path}: ${JSON.stringify(data)}`);
}

async function main() {
  const token = getFirebaseToken();
  const now = timestampValue();

  await patchDoc(token, `restaurants/${RESTAURANT_ID}`, {
    ownerId: stringValue(OWNER_ID),
    name: stringValue('RedRush Demo Kitchen'),
    cuisine: stringValue('Fast Food'),
    rating: doubleValue(4.8),
    reviewCount: integerValue(24),
    deliveryTime: stringValue('25-40 min'),
    deliveryFee: integerValue(500),
    minOrder: integerValue(1000),
    image: stringValue('https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80'),
    coverImage: stringValue('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80'),
    address: stringValue('Nairobi CBD'),
    isOpen: boolValue(true),
    distance: stringValue('2.4 km'),
    promo: stringValue('WELCOME20'),
    categories: arrayValue(['Meals', 'Drinks', 'Sides']),
    createdAt: now,
    updatedAt: now,
  });

  const menu = [
    {
      id: 'crispy-chicken-combo',
      name: 'Crispy Chicken Combo',
      description: 'Crispy chicken, fries, and a soft drink.',
      price: 1800,
      image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
      category: 'Meals',
      preparationTime: 20,
    },
    {
      id: 'loaded-fries',
      name: 'Loaded Fries',
      description: 'Fries topped with sauce, cheese, and herbs.',
      price: 950,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
      category: 'Sides',
      preparationTime: 12,
    },
    {
      id: 'fresh-juice',
      name: 'Fresh Juice',
      description: 'Seasonal fresh fruit juice.',
      price: 450,
      image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80',
      category: 'Drinks',
      preparationTime: 5,
    },
  ];

  for (const item of menu) {
    await patchDoc(token, `restaurants/${RESTAURANT_ID}/menu/${item.id}`, {
      name: stringValue(item.name),
      description: stringValue(item.description),
      price: integerValue(item.price),
      image: stringValue(item.image),
      category: stringValue(item.category),
      available: boolValue(true),
      preparationTime: integerValue(item.preparationTime),
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(`Seeded ${RESTAURANT_ID} with ${menu.length} menu items.`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
