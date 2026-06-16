// RedRush Mock Data
export type UserRole = 'customer' | 'vendor' | 'rider' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  address?: string;
  rating?: number;
  restaurantId?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  preparationTime: number;
}

export interface Restaurant {
  id: string;
  ownerId?: string;
  name: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  image: string;
  coverImage: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isOpen: boolean;
  distance: string;
  promo?: string;
  categories: string[];
  menu: MenuItem[];
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  restaurantId: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal?: number;
  total: number;
  deliveryFee: number;
  serviceCharge?: number;
  discount?: number;
  promoCode?: string;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  paymentMethod: string;
  paymentStatus?: 'pending' | 'collect_on_delivery' | 'cash_collected' | 'remitted' | 'settled' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  address: string;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  createdAt: string;
  estimatedDelivery: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  prepTime?: number;
  deliveryTime?: number;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface RiderEarning {
  date: string;
  deliveries: number;
  earnings: number;
}

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'r1',
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
      { id: 'm1', name: 'Mighty Burger', description: 'Double beef patty with special sauce, lettuce, tomato', price: 4500, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80', category: 'Burgers', available: true, preparationTime: 15 },
      { id: 'm2', name: 'Spicy Chicken Wings', description: '6 pieces of crispy spicy wings', price: 3200, image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=300&q=80', category: 'Chicken', available: true, preparationTime: 20 },
      { id: 'm3', name: 'Jollof Rice Combo', description: 'Jollof rice with fried chicken and coleslaw', price: 2800, image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&q=80', category: 'Sides', available: true, preparationTime: 10 },
      { id: 'm4', name: 'Mega Shawarma', description: 'Beef & chicken shawarma with garlic sauce', price: 3500, image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&q=80', category: 'Burgers', available: true, preparationTime: 12 },
      { id: 'm5', name: 'Zobo Drink (1L)', description: 'Fresh zobo with ginger and cloves', price: 800, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&q=80', category: 'Drinks', available: true, preparationTime: 5 },
    ],
  },
  {
    id: 'r2',
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
      { id: 'm6', name: 'Egusi Soup + Eba', description: 'Rich egusi soup with stockfish and assorted meat', price: 2200, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80', category: 'Soups', available: true, preparationTime: 10 },
      { id: 'm7', name: 'Fried Rice & Chicken', description: 'Nigerian-style fried rice with grilled chicken', price: 2500, image: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=300&q=80', category: 'Rice', available: true, preparationTime: 15 },
      { id: 'm8', name: 'Pounded Yam + Okra', description: 'Smooth pounded yam with fresh okra soup', price: 2800, image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=300&q=80', category: 'Swallows', available: true, preparationTime: 12 },
    ],
  },
  {
    id: 'r3',
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
      { id: 'm9', name: 'Pepperoni Supreme', description: '12" pizza with extra pepperoni and mozzarella', price: 6500, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80', category: 'Pizzas', available: true, preparationTime: 25 },
      { id: 'm10', name: 'Margherita Classic', description: 'Fresh tomato sauce, mozzarella, basil', price: 5000, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=80', category: 'Pizzas', available: true, preparationTime: 20 },
      { id: 'm11', name: 'Spaghetti Bolognese', description: 'Al dente pasta with rich meat sauce', price: 3800, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&q=80', category: 'Pasta', available: true, preparationTime: 18 },
    ],
  },
  {
    id: 'r4',
    name: 'Sushi & More',
    cuisine: 'Japanese',
    rating: 4.9,
    reviewCount: 654,
    deliveryTime: '35-50 min',
    deliveryFee: 800,
    minOrder: 5000,
    image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80',
    address: '7 Eko Hotel Way, VI',
    isOpen: false,
    distance: '3.4 km',
    categories: ['Sushi', 'Ramen', 'Bento', 'Drinks'],
    menu: [
      { id: 'm12', name: 'Salmon Roll (8pcs)', description: 'Fresh salmon with avocado and cucumber', price: 7500, image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300&q=80', category: 'Sushi', available: true, preparationTime: 20 },
      { id: 'm13', name: 'Tonkotsu Ramen', description: 'Rich pork bone broth with chashu pork', price: 5500, image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=300&q=80', category: 'Ramen', available: true, preparationTime: 25 },
    ],
  },
  {
    id: 'r5',
    name: 'Grillmaster BBQ',
    cuisine: 'BBQ & Grill',
    rating: 4.7,
    reviewCount: 1456,
    deliveryTime: '30-45 min',
    deliveryFee: 450,
    minOrder: 3000,
    image: 'https://images.unsplash.com/photo-1544025162-d76538d0e2c2?w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    address: '19 Lekki Phase 1',
    isOpen: true,
    distance: '1.8 km',
    promo: 'Buy 2 Get 1',
    categories: ['Grills', 'Ribs', 'Sides', 'Drinks'],
    menu: [
      { id: 'm14', name: 'BBQ Beef Ribs', description: '500g slow-cooked BBQ ribs with sauce', price: 8500, image: 'https://images.unsplash.com/photo-1544025162-d76538d0e2c2?w=300&q=80', category: 'Ribs', available: true, preparationTime: 30 },
      { id: 'm15', name: 'Grilled Tilapia', description: 'Whole grilled tilapia with pepper sauce and plantain', price: 5500, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&q=80', category: 'Grills', available: true, preparationTime: 25 },
      { id: 'm16', name: 'Suya Platter', description: 'Assorted suya: beef, chicken, ram', price: 4500, image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&q=80', category: 'Grills', available: true, preparationTime: 20 },
    ],
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord001',
    customerId: 'u1',
    restaurantId: 'r1',
    restaurantName: 'Chicken Republic',
    items: [
      { menuItem: MOCK_RESTAURANTS[0].menu[0], quantity: 2, restaurantId: 'r1' },
      { menuItem: MOCK_RESTAURANTS[0].menu[2], quantity: 1, restaurantId: 'r1' },
    ],
    total: 11800,
    deliveryFee: 500,
    status: 'delivered',
    paymentMethod: 'Mobile Money',
    address: '45 Saka Tinubu Street, VI',
    createdAt: '2026-05-04T14:30:00Z',
    estimatedDelivery: '2026-05-04T15:05:00Z',
    riderId: 'rd1',
    riderName: 'Chukwudi Eze',
  },
  {
    id: 'ord002',
    customerId: 'u1',
    restaurantId: 'r3',
    restaurantName: 'Pizza Palace',
    items: [
      { menuItem: MOCK_RESTAURANTS[2].menu[0], quantity: 1, restaurantId: 'r3' },
    ],
    total: 7100,
    deliveryFee: 600,
    status: 'preparing',
    paymentMethod: 'Card',
    address: '45 Saka Tinubu Street, VI',
    createdAt: '2026-05-05T12:00:00Z',
    estimatedDelivery: '2026-05-05T12:40:00Z',
    riderId: 'rd2',
    riderName: 'Emeka Johnson',
  },
];

export const MOCK_RIDER_EARNINGS: RiderEarning[] = [
  { date: 'Mon', deliveries: 8, earnings: 12400 },
  { date: 'Tue', deliveries: 11, earnings: 17600 },
  { date: 'Wed', deliveries: 6, earnings: 9200 },
  { date: 'Thu', deliveries: 14, earnings: 22100 },
  { date: 'Fri', deliveries: 16, earnings: 25800 },
  { date: 'Sat', deliveries: 19, earnings: 31000 },
  { date: 'Sun', deliveries: 12, earnings: 19200 },
];

export const CUISINES = ['All', 'Fast Food', 'Nigerian', 'Italian', 'Japanese', 'BBQ & Grill', 'Chinese', 'Continental'];
