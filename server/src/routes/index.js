import { Router } from 'express';
import adminRoutes from './adminRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import geocodeRoutes from './geocodeRoutes.js';
import ambulanceRoutes from './ambulanceRoutes.js';
import authRoutes from './authRoutes.js';
import bedRoutes from './bedRoutes.js';
import bookingOfferRoutes from './bookingOfferRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import emergencyRoutes from './emergencyRoutes.js';
import hospitalRequestRoutes from './hospitalRequestRoutes.js';
import hospitalRoutes from './hospitalRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reservationRoutes from './reservationRoutes.js';
import userRoutes from './userRoutes.js';
import { ok } from '../utils/response.js';

const router = Router();

/** Public, for Render health checks and demo warm-up. */
router.get('/health', (_req, res) => ok(res, { status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/', bedRoutes);
router.use('/emergencies', emergencyRoutes);
router.use('/hospital-requests', hospitalRequestRoutes);
router.use('/reservations', reservationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/bookings', bookingRoutes);
router.use('/booking-offers', bookingOfferRoutes);
router.use('/ambulance', ambulanceRoutes);
router.use('/geocode', geocodeRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);

export default router;
