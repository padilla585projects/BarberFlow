export type UserRole = 'client' | 'barber' | 'owner' | 'developer';

export type MembershipRole = 'barber' | 'owner';

export interface Membership {
  barbershopId: string;
  barbershopName: string;
  role: MembershipRole;
  joinedAt: Date;
}

export interface ShippingAddress {
  street: string;      // Calle y número
  city: string;        // Ciudad
  postalCode: string;  // Código postal
  province: string;    // Provincia/Comunidad autónoma
  country?: string;    // País (por defecto España)
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  barbershopId?: string;        // barbería activa (backward compat)
  activeBarbershopId?: string;  // barbería seleccionada actualmente
  memberships?: Membership[];   // todas las barberías donde trabaja
  shippingAddress?: ShippingAddress; // dirección de envío del cliente
  favoriteShops?: string[];     // IDs de barberías favoritas del cliente
}

export interface BookingSettings {
  minAdvanceHours: number;    // 1, 2, 4, 12, 24, 48
  maxAdvanceDays: number;     // 7, 14, 30, 60, 90
  autoConfirm: boolean;
}

export interface NotificationSettings {
  emailNewBooking: boolean;
  pushNewBooking: boolean;
}

export interface StripeConfig {
  enabled: boolean;
  publishableKey?: string;
  merchantEmail?: string;
  lastValidated?: Date;
}

export interface BizumConfig {
  enabled: boolean; // automático si Stripe está activo
}

export interface BankTransferConfig {
  enabled: boolean;
  iban?: string;
  accountHolder?: string;
  lastValidated?: Date;
}

export interface PayPalConfig {
  enabled: boolean;
  email?: string;
  lastValidated?: Date;
}

export interface CashConfig {
  enabled: boolean; // siempre disponible
}

export interface PaymentMethods {
  stripe?: StripeConfig;
  bizum?: BizumConfig;
  bankTransfer?: BankTransferConfig;
  paypal?: PayPalConfig;
  cash?: CashConfig;
}

export interface FeatureFlags {
  team?: boolean;    // gestión de barberos/equipo
  store?: boolean;   // tienda de productos
}

export interface Barbershop {
  id: string;
  name: string;
  address: string;
  phone: string;
  description?: string;
  photoURL?: string;
  ownerId: string;
  services: Service[];
  barbers: string[]; // array de UIDs
  openingHours: OpeningHours;
  bookingSettings?: BookingSettings;
  notificationSettings?: NotificationSettings;
  gallery?: string[];
  totalRatings?: number;
  ratingSum?: number;
  latitude?: number;   // GPS latitude (set by owner in admin panel)
  longitude?: number;  // GPS longitude
  paymentMethods?: PaymentMethods;
  featureFlags?: FeatureFlags;
  createdAt: Date;
}

export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: boolean;
  from: string; // "09:00"
  to: string;   // "20:00"
}

export interface Service {
  id: string;
  name: string;
  duration: number; // minutos
  price: number;
  description?: string;
}

export type PaymentMethod = 'cash' | 'bizum' | 'paypal';
export type PaymentStatus = 'pending' | 'client_confirmed' | 'confirmed' | 'paid';

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  barbershopId: string;
  barberName?: string;
  barbershopName?: string;
  reviewed?: boolean;
  services: Service[];
  date: Date;
  timeSlot: string; // "10:00"
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  totalPrice: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  createdAt: Date;
}

export interface WaitlistEntry {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  barberId: string;
  barberName: string;
  date: Date;
  services: { name: string; price: number; duration: number }[];
  totalPrice: number;
  createdAt: Date;
  status: 'waiting' | 'notified' | 'removed';
}

export interface Product {
  id: string;
  barbershopId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  photoURL?: string;
  totalRatings?: number; // número de reseñas
  ratingSum?: number;    // suma de todas las puntuaciones (avg = ratingSum / totalRatings)
}

export interface Sale {
  id: string;
  barberId: string;
  barbershopId: string;
  clientId?: string;
  appointmentId?: string;
  items: SaleItem[];
  totalAmount: number;
  tipAmount?: number;
  date: Date;
}

export interface SaleItem {
  type: 'service' | 'product';
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PointTransaction {
  id: string;
  type: 'earned' | 'redeemed';
  points: number;
  description: string;
  date: Date;
  appointmentId?: string;
}

export interface LoyaltyReward {
  pointsCost: number;
  discountValue: number;
  description: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  pointsPerEuro: number;
  rewards: LoyaltyReward[];
}

export interface NotificationPreferences {
  appointments: boolean;  // New/changed appointment notifications
  reminders: boolean;     // 24h appointment reminders
  reviews: boolean;       // New review notifications
  loyalty: boolean;       // Points earned notifications
  messages: boolean;      // Internal message notifications
  dailySummary: boolean;  // Daily summary (owner only)
  marketing: boolean;     // Promo/campaign notifications
}
