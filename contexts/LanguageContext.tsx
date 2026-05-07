import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'en' | 'sw';

export type TranslationKey =
  | 'account'
  | 'active'
  | 'aboutRedRush'
  | 'accepted'
  | 'admin'
  | 'adminDesc'
  | 'authFailed'
  | 'allRestaurants'
  | 'browseMenus'
  | 'cancel'
  | 'cancelled'
  | 'cart'
  | 'closed'
  | 'completedOrders'
  | 'createAccount'
  | 'customer'
  | 'customerDesc'
  | 'delivery'
  | 'delivered'
  | 'deliveryTime'
  | 'editProfile'
  | 'emailAddress'
  | 'favouriteRestaurants'
  | 'favourites'
  | 'featureSoon'
  | 'foodDeliveryFast'
  | 'freeDelivery'
  | 'fullName'
  | 'getStarted'
  | 'google'
  | 'googleLoading'
  | 'googleSignIn'
  | 'helpSupport'
  | 'language'
  | 'languageEnglish'
  | 'languageKiswahili'
  | 'login'
  | 'loginWith'
  | 'first3Orders'
  | 'hello'
  | 'history'
  | 'home'
  | 'missingFields'
  | 'missingFieldsBody'
  | 'next'
  | 'notifications'
  | 'noActiveOrders'
  | 'noOrderHistory'
  | 'noResultsFound'
  | 'orderFood'
  | 'orders'
  | 'onTheWay'
  | 'open'
  | 'otpBody'
  | 'otpTitle'
  | 'password'
  | 'pending'
  | 'paymentMethods'
  | 'phoneNumber'
  | 'placeOrderToSeeIt'
  | 'points'
  | 'profile'
  | 'promoCodes'
  | 'realTimeTracking'
  | 'redeem'
  | 'restaurantsNearYou'
  | 'ready'
  | 'preparing'
  | 'price'
  | 'restaurant'
  | 'restaurantDesc'
  | 'relevance'
  | 'rating'
  | 'reviews'
  | 'myReviews'
  | 'myOrders'
  | 'search'
  | 'searchRestaurantsCuisines'
  | 'searchRestaurantsDishes'
  | 'rider'
  | 'riderDesc'
  | 'savedAddresses'
  | 'settings'
  | 'signOut'
  | 'signOutConfirm'
  | 'signUp'
  | 'signUpAs'
  | 'signUpWith'
  | 'skip'
  | 'specificRoleDashboard'
  | 'startOrdering'
  | 'supportingOnboarding'
  | 'trackYourOrder'
  | 'topRestaurants'
  | 'tryAgain'
  | 'tryDifferentKeywords'
  | 'verifyOtp'
  | 'vendor'
  | 'vendorDesc';

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    account: 'Account',
    active: 'Active',
    aboutRedRush: 'About RedRush',
    accepted: 'Accepted',
    admin: 'Admin',
    adminDesc: 'Manage the platform',
    authFailed: 'Authentication Failed',
    allRestaurants: 'All Restaurants',
    browseMenus: 'Browse menus, compare prices, and order from top restaurants across your city.',
    cancel: 'Cancel',
    cancelled: 'Cancelled',
    cart: 'Cart',
    closed: 'Closed',
    completedOrders: 'Your completed orders will appear here',
    createAccount: 'Create Account',
    customer: 'Customer',
    customerDesc: 'Order food & track delivery',
    delivery: 'Delivery',
    delivered: 'Delivered',
    deliveryTime: 'Delivery Time',
    editProfile: 'Edit Profile',
    emailAddress: 'Email Address',
    favouriteRestaurants: 'Favourite Restaurants',
    favourites: 'Favourites',
    featureSoon: 'This feature is coming soon.',
    foodDeliveryFast: 'Food delivery made fast',
    freeDelivery: 'Free Delivery',
    fullName: 'Full Name',
    getStarted: 'Get Started',
    google: 'Google',
    googleLoading: 'Google Sign-In is still loading. Please try again in a moment.',
    googleSignIn: 'Google Sign-In',
    helpSupport: 'Help & Support',
    language: 'Language',
    languageEnglish: 'English',
    languageKiswahili: 'Kiswahili',
    login: 'Login',
    loginWith: 'or login with',
    first3Orders: 'On your first 3 orders',
    hello: 'Hello',
    history: 'History',
    home: 'Home',
    missingFields: 'Missing Fields',
    missingFieldsBody: 'Please fill in all required fields.',
    next: 'Next',
    notifications: 'Notifications',
    noActiveOrders: 'No active orders',
    noOrderHistory: 'No order history',
    noResultsFound: 'No results found',
    orderFood: 'Order Your Favourite Food',
    orders: 'Orders',
    onTheWay: 'On the way',
    open: 'open',
    otpBody: 'Phone OTP requires Firebase phone auth and reCAPTCHA verifier setup for the release build.',
    otpTitle: 'OTP Verification',
    password: 'Password',
    pending: 'Pending',
    paymentMethods: 'Payment Methods',
    phoneNumber: 'Phone Number',
    placeOrderToSeeIt: 'Place an order to see it here',
    points: 'points',
    profile: 'Profile',
    promoCodes: 'Promo Codes',
    realTimeTracking: 'Real-Time Delivery Tracking',
    redeem: 'Redeem',
    restaurantsNearYou: 'Restaurants Near You',
    ready: 'Ready',
    preparing: 'Preparing',
    price: 'Price',
    restaurant: 'Restaurant',
    restaurantDesc: 'Manage your restaurant',
    relevance: 'Relevance',
    rating: 'Rating',
    reviews: 'Reviews',
    myReviews: 'My Reviews',
    myOrders: 'My Orders',
    search: 'Search',
    searchRestaurantsCuisines: 'Search restaurants, cuisines...',
    searchRestaurantsDishes: 'Search restaurants or dishes...',
    rider: 'Rider',
    riderDesc: 'Earn by delivering',
    savedAddresses: 'Saved Addresses',
    settings: 'Settings',
    signOut: 'Sign Out',
    signOutConfirm: 'Are you sure you want to sign out?',
    signUp: 'Sign Up',
    signUpAs: 'Sign up as',
    signUpWith: 'or sign up with',
    skip: 'Skip',
    specificRoleDashboard: 'Login uses your saved account role and opens the right dashboard.',
    startOrdering: 'Discover hundreds of restaurants near you. Get food delivered hot and fresh in minutes.',
    supportingOnboarding: 'Watch your rider in real-time. Pay with Mobile Money, Card, or Cash on delivery.',
    trackYourOrder: 'Track your order',
    topRestaurants: 'Restaurants at Your Fingertips',
    tryAgain: 'Please try again.',
    tryDifferentKeywords: 'Try different keywords or filters',
    verifyOtp: 'Verify with OTP instead',
    vendor: 'Restaurant',
    vendorDesc: 'Manage your restaurant',
  },
  sw: {
    account: 'Akaunti',
    active: 'Zinazoendelea',
    aboutRedRush: 'Kuhusu RedRush',
    accepted: 'Imekubaliwa',
    admin: 'Msimamizi',
    adminDesc: 'Simamia mfumo',
    authFailed: 'Uthibitishaji umeshindikana',
    allRestaurants: 'Migahawa Yote',
    browseMenus: 'Tazama menyu, linganisha bei, na uagize kutoka migahawa bora jijini.',
    cancel: 'Ghairi',
    cancelled: 'Imeghairiwa',
    cart: 'Kikapu',
    closed: 'Imefungwa',
    completedOrders: 'Oda zako zilizokamilika zitaonekana hapa',
    createAccount: 'Fungua Akaunti',
    customer: 'Mteja',
    customerDesc: 'Agiza chakula na fuatilia usafirishaji',
    delivery: 'Usafirishaji',
    delivered: 'Imefikishwa',
    deliveryTime: 'Muda wa Usafirishaji',
    editProfile: 'Hariri Wasifu',
    emailAddress: 'Barua pepe',
    favouriteRestaurants: 'Migahawa pendwa',
    favourites: 'Vipendwa',
    featureSoon: 'Kipengele hiki kinakuja hivi karibuni.',
    foodDeliveryFast: 'Usafirishaji wa chakula kwa haraka',
    freeDelivery: 'Usafirishaji Bure',
    fullName: 'Jina kamili',
    getStarted: 'Anza',
    google: 'Google',
    googleLoading: 'Google Sign-In bado inapakia. Jaribu tena baada ya muda mfupi.',
    googleSignIn: 'Ingia kwa Google',
    helpSupport: 'Msaada na Usaidizi',
    language: 'Lugha',
    languageEnglish: 'Kiingereza',
    languageKiswahili: 'Kiswahili',
    login: 'Ingia',
    loginWith: 'au ingia kwa',
    first3Orders: 'Kwa oda zako 3 za kwanza',
    hello: 'Habari',
    history: 'Historia',
    home: 'Nyumbani',
    missingFields: 'Taarifa hazijakamilika',
    missingFieldsBody: 'Tafadhali jaza sehemu zote muhimu.',
    next: 'Endelea',
    notifications: 'Arifa',
    noActiveOrders: 'Hakuna oda zinazoendelea',
    noOrderHistory: 'Hakuna historia ya oda',
    noResultsFound: 'Hakuna matokeo yaliyopatikana',
    orderFood: 'Agiza Chakula Unachokipenda',
    orders: 'Oda',
    onTheWay: 'Iko njiani',
    open: 'imefunguliwa',
    otpBody: 'OTP ya simu inahitaji Firebase phone auth na reCAPTCHA kwa toleo la release.',
    otpTitle: 'Uthibitishaji wa OTP',
    password: 'Nenosiri',
    pending: 'Inasubiri',
    paymentMethods: 'Njia za Malipo',
    phoneNumber: 'Nambari ya Simu',
    placeOrderToSeeIt: 'Agiza chakula ili uione hapa',
    points: 'pointi',
    profile: 'Wasifu',
    promoCodes: 'Kodi za punguzo',
    realTimeTracking: 'Fuatilia Usafirishaji Moja kwa Moja',
    redeem: 'Tumia',
    restaurantsNearYou: 'Migahawa Karibu Nawe',
    ready: 'Iko tayari',
    preparing: 'Inaandaliwa',
    price: 'Bei',
    restaurant: 'Mgahawa',
    restaurantDesc: 'Simamia mgahawa wako',
    relevance: 'Uhusiano',
    rating: 'Ukadiriaji',
    reviews: 'Maoni',
    myReviews: 'Maoni Yangu',
    myOrders: 'Oda Zangu',
    search: 'Tafuta',
    searchRestaurantsCuisines: 'Tafuta migahawa, aina za vyakula...',
    searchRestaurantsDishes: 'Tafuta migahawa au vyakula...',
    rider: 'Msafirishaji',
    riderDesc: 'Pata kipato kwa kusafirisha',
    savedAddresses: 'Anwani Zilizohifadhiwa',
    settings: 'Mipangilio',
    signOut: 'Toka',
    signOutConfirm: 'Una uhakika unataka kutoka?',
    signUp: 'Jisajili',
    signUpAs: 'Jisajili kama',
    signUpWith: 'au jisajili kwa',
    skip: 'Ruka',
    specificRoleDashboard: 'Kuingia hutumia nafasi yako iliyohifadhiwa na kufungua dashibodi sahihi.',
    startOrdering: 'Gundua mamia ya migahawa karibu nawe. Pata chakula kikiwa moto na freshi kwa dakika chache.',
    supportingOnboarding: 'Fuatilia msafirishaji wako moja kwa moja. Lipa kwa Mobile Money, kadi, au pesa taslimu.',
    trackYourOrder: 'Fuatilia oda yako',
    topRestaurants: 'Migahawa Ipo Kiganjani Mwako',
    tryAgain: 'Tafadhali jaribu tena.',
    tryDifferentKeywords: 'Jaribu maneno au vichujio tofauti',
    verifyOtp: 'Thibitisha kwa OTP badala yake',
    vendor: 'Mgahawa',
    vendorDesc: 'Simamia mgahawa wako',
  },
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    AsyncStorage.getItem('redrush.language').then(value => {
      if (value === 'en' || value === 'sw') setLanguageState(value);
    });
  }, []);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    AsyncStorage.setItem('redrush.language', nextLanguage).catch(() => undefined);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage(language === 'en' ? 'sw' : 'en'),
      t: (key: TranslationKey) => translations[language][key] || translations.en[key] || key,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
