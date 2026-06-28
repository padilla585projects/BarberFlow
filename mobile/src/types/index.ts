export type UserRole = 'client' | 'barber' | 'owner' | 'developer';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  barbershopId?: string; // para barber y owner
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
}

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  barbershopId: string;
  services: Service[];
  date: Date;
  timeSlot: string; // "10:00"
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  totalPrice: number;
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
}

export interface Sale {
  id: string;
  barberId: string;
  barbershopId: string;
  clientId?: string;
  appointmentId?: string;
  items: SaleItem[];
  totalAmount: number;
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
