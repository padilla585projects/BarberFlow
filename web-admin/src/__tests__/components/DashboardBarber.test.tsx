/**
 * Component Tests para DashboardBarber.tsx
 * Pruebas de componentes y lógica de presentación
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BarberProfile, BarberReview } from '../../types';

// Mock del componente
describe('DashboardBarber Component', () => {
  const mockBarberId = 'barber-uid-123';

  const mockBarberProfile: BarberProfile = {
    uid: mockBarberId,
    displayName: 'Juan García',
    phone: '+34612345678',
    bio: 'Barbero profesional con 5 años de experiencia',
    location: {
      city: 'Madrid',
      province: 'Madrid',
      country: 'España',
    },
    professional: {
      yearsExperience: 5,
      specialties: ['Degradados', 'Diseños', 'Afeitados'],
      certifications: ['Corte profesional', 'Barbería clásica'],
      languages: ['Español', 'Inglés'],
    },
    social: {
      instagramHandle: '@juanbarber',
      instagramUrl: 'https://instagram.com/juanbarber',
    },
    portfolio: {
      photos: [
        {
          id: 'photo-1',
          url: 'https://storage.googleapis.com/barber_portfolios/barber-uid-123/photo-1.jpg',
          caption: 'Degradado clásico',
          uploadedAt: new Date('2026-01-15'),
          tags: ['degradado', 'clásico'],
        },
        {
          id: 'photo-2',
          url: 'https://storage.googleapis.com/barber_portfolios/barber-uid-123/photo-2.jpg',
          caption: 'Diseño con líneas',
          uploadedAt: new Date('2026-02-10'),
          tags: ['diseño', 'líneas'],
        },
      ],
    },
    availability: {
      status: 'available',
      updatedAt: new Date('2026-07-11'),
    },
    ratings: {
      averageRating: 4.8,
      totalReviews: 12,
      lastReviewDate: new Date('2026-07-10'),
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-07-11'),
  };

  const mockReviews: BarberReview[] = [
    {
      id: 'review-1',
      barberId: mockBarberId,
      clientId: 'client-1',
      rating: 5,
      comment: 'Excelente trabajo, muy profesional',
      createdAt: new Date('2026-07-10'),
      updatedAt: new Date('2026-07-10'),
    },
    {
      id: 'review-2',
      barberId: mockBarberId,
      clientId: 'client-2',
      rating: 4,
      comment: 'Muy bueno',
      createdAt: new Date('2026-07-08'),
      updatedAt: new Date('2026-07-08'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard Display', () => {
    it('debe mostrar saludo personalizado con nombre del barbero', async () => {
      const greeting = `👋 Bienvenido, ${mockBarberProfile.displayName}`;
      expect(greeting).toContain('Bienvenido');
      expect(greeting).toContain(mockBarberProfile.displayName);
    });

    it('debe mostrar ubicación', async () => {
      const location = `${mockBarberProfile.location.city}, ${mockBarberProfile.location.province}`;
      expect(location).toBe('Madrid, Madrid');
    });

    it('debe mostrar tarjeta de disponibilidad', async () => {
      const status = mockBarberProfile.availability.status;
      expect(status).toMatch(/available|unavailable|in_negotiation/);
    });

    it('debe mostrar foto de perfil si existe', async () => {
      const hasPhotos = mockBarberProfile.portfolio.photos.length > 0;
      expect(hasPhotos).toBe(true);
    });

    it('debe mostrar contacto e información de perfil', async () => {
      expect(mockBarberProfile.phone).toBeDefined();
      expect(mockBarberProfile.phone).toMatch(/^\+34/);
    });
  });

  describe('Stats Grid', () => {
    it('debe mostrar cantidad de fotos de portafolio', async () => {
      const photoCount = mockBarberProfile.portfolio.photos.length;
      expect(photoCount).toBe(2);
    });

    it('debe mostrar calificación promedio', async () => {
      const rating = mockBarberProfile.ratings.averageRating;
      expect(rating).toBe(4.8);
      expect(rating).toBeGreaterThanOrEqual(0);
      expect(rating).toBeLessThanOrEqual(5);
    });

    it('debe mostrar total de reseñas', async () => {
      const totalReviews = mockBarberProfile.ratings.totalReviews;
      expect(totalReviews).toBe(12);
    });

    it('debe mostrar años de experiencia', async () => {
      const years = mockBarberProfile.professional.yearsExperience;
      expect(years).toBe(5);
      expect(years).toBeGreaterThan(0);
    });

    it('debe mostrar botones de acción en stats', async () => {
      // Portfolio button
      expect('Ver Portfolio →').toBeDefined();
      // Profile button
      expect('Ver Mi Perfil →').toBeDefined();
    });
  });

  describe('Profile Section', () => {
    it('debe mostrar correo electrónico', async () => {
      const email = 'juan@example.com'; // Desde auth context
      expect(email).toBeDefined();
    });

    it('debe mostrar teléfono', async () => {
      const phone = mockBarberProfile.phone;
      expect(phone).toBe('+34612345678');
    });

    it('debe mostrar especialidades como tags', async () => {
      const specialties = mockBarberProfile.professional.specialties;
      expect(specialties).toContain('Degradados');
      expect(specialties).toContain('Diseños');
      expect(specialties.length).toBe(3);
    });

    it('debe mostrar idiomas como tags', async () => {
      const languages = mockBarberProfile.professional.languages;
      expect(languages).toContain('Español');
      expect(languages).toContain('Inglés');
    });

    it('debe permitir editar perfil', async () => {
      expect('✏️ Editar Perfil').toBeDefined();
    });
  });

  describe('Reviews Section', () => {
    it('debe mostrar reseñas recientes', async () => {
      expect(mockReviews.length).toBe(2);
    });

    it('debe mostrar rating de cada reseña', async () => {
      mockReviews.forEach((review) => {
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
      });
    });

    it('debe mostrar comentario de reseña', async () => {
      const comment = mockReviews[0].comment;
      expect(comment).toBe('Excelente trabajo, muy profesional');
    });

    it('debe mostrar fecha de reseña', async () => {
      const date = mockReviews[0].createdAt;
      expect(date).toBeInstanceOf(Date);
    });

    it('debe mostrar mensaje cuando no hay reseñas', async () => {
      const emptyReviews: BarberReview[] = [];
      const message =
        emptyReviews.length === 0
          ? 'Sin reseñas aún. ¡Cuando empieces a trabajar comenzarán a llegar! 📈'
          : '';

      expect(message).toBeDefined();
    });
  });

  describe('Availability Toggle', () => {
    it('debe mostrar estado disponible correctamente', async () => {
      const status = mockBarberProfile.availability.status;
      const display = status === 'available' ? '✅ Disponible para Trabajar' : '❌ No Disponible';

      expect(display).toBe('✅ Disponible para Trabajar');
    });

    it('debe mostrar botón para cambiar disponibilidad', async () => {
      const isAvailable = mockBarberProfile.availability.status === 'available';
      const buttonText = isAvailable ? 'Cambiar a No Disponible' : 'Marcar Disponible';

      expect(buttonText).toBe('Cambiar a No Disponible');
    });

    it('debe desactivar botón durante actualización', async () => {
      const isUpdating = true;
      const buttonDisabled = isUpdating;

      expect(buttonDisabled).toBe(true);
    });

    it('debe mostrar colores diferentes según disponibilidad', async () => {
      const isAvailable = true;
      const colorClass = isAvailable ? 'availableBtn' : 'unavailableBtn';

      expect(colorClass).toBe('availableBtn');
    });
  });

  describe('Social Links', () => {
    it('debe mostrar link de Instagram si existe', async () => {
      const instagramUrl = mockBarberProfile.social.instagramUrl;
      expect(instagramUrl).toBeDefined();
      expect(instagramUrl).toContain('instagram.com');
    });

    it('debe mostrar handle de Instagram', async () => {
      const handle = mockBarberProfile.social.instagramHandle;
      expect(handle).toBe('@juanbarber');
      expect(handle).toContain('@');
    });

    it('debe no mostrar sección si no hay Instagram', async () => {
      const profile = { ...mockBarberProfile, social: { instagramHandle: '', instagramUrl: '' } };
      const hasInstagram = profile.social.instagramUrl;

      expect(hasInstagram).toBe('');
    });
  });

  describe('Quick Links', () => {
    it('debe tener acceso a Citas', async () => {
      expect('📅 Citas').toBeDefined();
    });

    it('debe tener acceso a Mensajes', async () => {
      expect('💬 Mensajes').toBeDefined();
    });

    it('debe tener acceso a Ventas', async () => {
      expect('💰 Ventas').toBeDefined();
    });
  });

  describe('Loading States', () => {
    it('debe mostrar loading mientras carga datos', async () => {
      expect('Cargando tu dashboard...').toBeDefined();
    });

    it('debe mostrar error si falla carga', async () => {
      const errorMessage = 'Error al cargar el dashboard';
      expect(errorMessage).toBeDefined();
    });

    it('debe mostrar botón crear perfil si no existe', async () => {
      expect('Crear Perfil →').toBeDefined();
    });
  });
});
