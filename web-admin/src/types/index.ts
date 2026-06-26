export type UserRole = 'client' | 'barber' | 'owner' | 'developer';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  barbershopId?: string;
  /** Citas que puede atender por hora. Slot = 60 / appointmentsPerHour minutos */
  appointmentsPerHour?: number;
  phone?: string;
  bio?: string;
}

export interface Barbershop {
  id: string;
  name: string;
  address: string;
  phone: string;
  photoURL?: string;
  ownerId: string;
  services: Service[];
  barbers: string[];
  openingHours: OpeningHours;
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
  from: string;
  to: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  barbershopId: string;
  services: Service[];
  date: Date;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  createdAt: Date;
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

export interface BarberStats {
  barberId: string;
  barberName: string;
  totalClients: number;
  totalServices: number;
  totalProductsSold: number;
  totalEarnings: number;
  period: { from: Date; to: Date };
}
