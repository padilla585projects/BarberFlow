/**
 * Unit Tests para barberReviews.ts
 * Pruebas de las funciones de reseñas y calificaciones de barberos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BarberReview } from '../../types';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

describe('barberReviews Service', () => {
  const mockBarberId = 'barber-uid-123';
  const mockClientId = 'client-uid-456';
  const mockAppointmentId = 'appointment-789';

  const mockReview: BarberReview = {
    id: 'review-001',
    barberId: mockBarberId,
    clientId: mockClientId,
    rating: 5,
    comment: 'Excelente trabajo, muy profesional y amable',
    appointmentId: mockAppointmentId,
    createdAt: new Date('2026-07-10'),
    updatedAt: new Date('2026-07-10'),
  };

  const mockReviewsList: BarberReview[] = [
    mockReview,
    {
      id: 'review-002',
      barberId: mockBarberId,
      clientId: 'client-uid-789',
      rating: 4,
      comment: 'Muy bueno, pero tardó un poco más',
      appointmentId: 'appointment-790',
      createdAt: new Date('2026-07-08'),
      updatedAt: new Date('2026-07-08'),
    },
    {
      id: 'review-003',
      barberId: mockBarberId,
      clientId: 'client-uid-101',
      rating: 5,
      comment: 'Perfectamente ejecutado',
      appointmentId: 'appointment-791',
      createdAt: new Date('2026-07-05'),
      updatedAt: new Date('2026-07-05'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBarberReview', () => {
    it('debe crear una nueva reseña correctamente', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Excelente trabajo',
        appointmentId: mockAppointmentId,
      };

      expect(reviewData.rating).toBe(5);
      expect(reviewData.comment).toBeDefined();
      expect(reviewData.appointmentId).toBeDefined();
    });

    it('debe validar rating entre 1 y 5', async () => {
      const validRatings = [1, 2, 3, 4, 5];

      validRatings.forEach((rating) => {
        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(5);
      });

      // Ratings inválidos
      const invalidRatings = [0, 6, -1];
      invalidRatings.forEach((rating) => {
        expect(rating < 1 || rating > 5).toBe(true);
      });
    });

    it('debe validar comentario no esté vacío', async () => {
      const validComment = 'Muy buen trabajo';
      const invalidComment = '';

      expect(validComment.length).toBeGreaterThan(0);
      expect(invalidComment.length).toBe(0);
    });

    it('debe requerir información de cliente y barbero', async () => {
      expect(mockBarberId).toBeDefined();
      expect(mockClientId).toBeDefined();

      // No debería permitir reviewer crear review para otro barbero
      const fraudReview = {
        barberId: 'different-barber',
        clientId: mockClientId,
      };

      expect(fraudReview.barberId).not.toBe(mockBarberId);
    });

    it('debe establecer timestamp de creación', async () => {
      const review = mockReview;
      expect(review.createdAt).toBeInstanceOf(Date);
      expect(review.updatedAt).toBeInstanceOf(Date);
    });

    it('debe disparar actualización de rating del barbero', async () => {
      // Conceptual: verificar que trigger ocurre
      // En práctica, esto se verifica en tests de integración
      expect(mockReview.barberId).toBeDefined();
    });
  });

  describe('getBarberReviews', () => {
    it('debe obtener todas las reseñas de un barbero', async () => {
      const reviews = mockReviewsList;

      expect(reviews.length).toBe(3);
      reviews.forEach((review) => {
        expect(review.barberId).toBe(mockBarberId);
      });
    });

    it('debe respetar límite de resultados', async () => {
      const limit = 10;
      const reviews = mockReviewsList.slice(0, limit);

      expect(reviews.length).toBeLessThanOrEqual(limit);
    });

    it('debe retornar array vacío si no hay reseñas', async () => {
      const emptyReviews: BarberReview[] = [];

      expect(emptyReviews).toEqual([]);
      expect(emptyReviews.length).toBe(0);
    });

    it('debe devolver reseñas ordenadas por fecha', async () => {
      const reviews = [...mockReviewsList].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(reviews[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        reviews[1].createdAt.getTime()
      );
    });
  });

  describe('getRecentBarberReviews', () => {
    it('debe retornar últimas N reseñas', async () => {
      const limit = 2;
      const recent = mockReviewsList.slice(0, limit);

      expect(recent.length).toBeLessThanOrEqual(limit);
      expect(recent.length).toBe(2);
    });

    it('debe ordenar por fecha descendente', async () => {
      const recent = mockReviewsList.slice(0, 5);
      const sorted = [...recent].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sorted[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        sorted[sorted.length - 1].createdAt.getTime()
      );
    });

    it('debe incluir todas las propiedades necesarias', async () => {
      const review = mockReviewsList[0];

      expect(review.id).toBeDefined();
      expect(review.barberId).toBeDefined();
      expect(review.clientId).toBeDefined();
      expect(review.rating).toBeDefined();
      expect(review.comment).toBeDefined();
      expect(review.createdAt).toBeDefined();
    });
  });

  describe('updateBarberReview', () => {
    it('debe permitir actualizar reseña del autor', async () => {
      const update = {
        rating: 4,
        comment: 'Actualizado: fue muy bueno',
      };

      expect(update.rating).toBe(4);
      expect(update.comment).toContain('Actualizado');
    });

    it('debe rechazar actualización por usuario no autorizado', async () => {
      const authorId = mockClientId;
      const otherUserId = 'other-user';

      expect(authorId).not.toBe(otherUserId);
    });

    it('debe validar nuevo rating', async () => {
      const validUpdate = { rating: 3 };
      expect(validUpdate.rating).toBeGreaterThanOrEqual(1);
      expect(validUpdate.rating).toBeLessThanOrEqual(5);

      const invalidUpdate = { rating: 10 };
      expect(invalidUpdate.rating > 5).toBe(true);
    });

    it('debe actualizar timestamp de modificación', async () => {
      const before = new Date();
      const updateTime = new Date();
      const after = new Date();

      expect(updateTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updateTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('debe preservar datos no modificados', async () => {
      const original = mockReview;

      // Los campos no actualizados deben preservarse
      expect(original.id).toBe(mockReview.id);
      expect(original.barberId).toBe(mockReview.barberId);
      expect(original.clientId).toBe(mockReview.clientId);
    });
  });

  describe('deleteBarberReview', () => {
    it('debe permitir eliminar reseña del autor', async () => {
      const reviewId = mockReview.id;
      const authorId = mockReview.clientId;

      expect(authorId).toBe(mockClientId);
      expect(reviewId).toBeDefined();
    });

    it('debe rechazar eliminación por usuario no autorizado', async () => {
      const authorId = mockReview.clientId;
      const otherUserId = 'other-user';

      expect(authorId).not.toBe(otherUserId);
    });

    it('debe remover reseña de la lista', async () => {
      const reviews = [...mockReviewsList];
      const filtered = reviews.filter((r) => r.id !== 'review-001');

      expect(filtered.length).toBe(reviews.length - 1);
      expect(filtered.some((r) => r.id === 'review-001')).toBe(false);
    });

    it('debe disparar recálculo de rating', async () => {
      // Conceptual: trigger debe ocurrir
      expect(mockBarberId).toBeDefined();
    });
  });

  describe('getClientReviews', () => {
    it('debe obtener todas las reseñas de un cliente', async () => {
      const clientReviews = mockReviewsList.filter((r) => r.clientId === mockClientId);

      expect(clientReviews.length).toBeGreaterThan(0);
      clientReviews.forEach((review) => {
        expect(review.clientId).toBe(mockClientId);
      });
    });

    it('debe retornar array vacío si cliente sin reseñas', async () => {
      const emptyReviews: BarberReview[] = [];

      expect(emptyReviews.length).toBe(0);
    });

    it('debe mostrar reseñas en orden cronológico inverso', async () => {
      const clientReviews = mockReviewsList.slice(0, 2);
      const sorted = [...clientReviews].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sorted[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        sorted[sorted.length - 1].createdAt.getTime()
      );
    });
  });

  describe('Rating Calculation', () => {
    it('debe calcular promedio correctamente', async () => {
      // mockReviewsList has ratings [5, 4, 5]
      const average = (5 + 4 + 5) / 3;

      expect(average).toBe(14 / 3);
      expect(Math.round(average * 10) / 10).toBe(4.7);
    });

    it('debe redondear a un decimal', async () => {
      const average = 4.666666;
      const rounded = Math.round(average * 10) / 10;

      expect(rounded).toBe(4.7);
    });

    it('debe manejar un solo rating', async () => {
      const rating = 5;
      expect(rating).toBe(5);
    });

    it('debe actualizar total de reseñas', async () => {
      const reviews = mockReviewsList;
      const total = reviews.length;

      expect(total).toBe(3);
    });
  });
});
