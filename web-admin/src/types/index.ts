export type UserRole = 'client' | 'barber' | 'owner' | 'developer';

export interface ShippingAddress {
  street: string;
  city: string;
  postalCode: string;
  province: string;
  country?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  barbershopId?: string;
  activeBarbershopId?: string;
  memberships?: { barbershopId: string; barbershopName: string; role: 'barber' | 'owner'; joinedAt: Date }[];
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
  duration: number; // minutos
  price: number;
  description?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  barbershopId: string;
  services: Service[];
  date: Date;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  totalPrice: number;
  createdAt: Date;
  paymentMethod?: 'cash' | 'bizum' | 'paypal';
  paymentStatus?: 'pending' | 'client_confirmed' | 'confirmed' | 'paid';
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

export interface BarberStats {
  barberId: string;
  barberName: string;
  totalClients: number;
  totalServices: number;
  totalProductsSold: number;
  totalEarnings: number;
  period: { from: Date; to: Date };
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  barbershopId: string;
  barbershopName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  address?: string;            // legacy (no usado)
  shippingAddress?: ShippingAddress;
  notes?: string;
  createdAt: Date;
  paymentMethod?: 'cash' | 'bizum' | 'paypal';
  paymentStatus?: 'pending' | 'client_confirmed' | 'confirmed' | 'paid';
}

export interface Review {
  id: string;
  clientId: string;
  clientName: string;
  barberId: string;
  barberName: string;
  barbershopId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface Promo {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  barbershopId: string;
  maxUses: number;
  currentUses: number;
  active: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface BarberProfilePhoto {
  id: string; // UUID
  url: string; // Firebase Storage URL
  caption?: string;
  uploadedAt: Date;
  tags?: string[]; // ej: ['corte', 'diseño']
}

export interface BarberProfile {
  uid: string;
  displayName: string;
  phone: string;
  bio: string;
  location: {
    city: string;
    province: string;
    country?: string;
  };
  professional: {
    yearsExperience: number;
    specialties: string[]; // ej: ['cortes clásicos', 'diseños modernos', 'afeitados']
    certifications?: string[];
    languages: string[];
  };
  social: {
    instagramHandle?: string;
    instagramUrl?: string;
  };
  portfolio: {
    photos: BarberProfilePhoto[];
  };
  availability: {
    status: 'available' | 'unavailable' | 'in_negotiation';
    updatedAt: Date;
  };
  ratings: {
    averageRating: number; // 0-5, calculado
    totalReviews: number;
    lastReviewDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BarberReview {
  id: string;
  barberId: string; // ref a User.uid
  clientId: string; // ref a User.uid
  rating: number; // 1-5
  comment: string;
  appointmentId?: string; // ref a Appointment.id
  createdAt: Date;
  updatedAt: Date;
}
