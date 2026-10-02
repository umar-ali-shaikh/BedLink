import mongoose from 'mongoose';
import {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  CANCEL_REASON_VALUES,
  CANCELLED_BY,
  CONDITION_VALUES,
  MAX_BOOKING_NOTES_LENGTH,
  MAX_CANCEL_NOTE_LENGTH,
} from '../constants/booking.js';
import { DEFAULT_URGENCY, URGENCY_VALUES } from '../constants/emergency.js';
import { pointSchema } from './Hospital.js';
import { jsonOptions } from './plugins/toJSON.js';

const { ObjectId } = mongoose.Schema.Types;

/**
 * A public ambulance booking (ARCHITECTURE.md §6.9). The only place personal data lives:
 * name, phone, notes and the pickup place are purged after BOOKING_PII_RETENTION_DAYS once
 * the booking is closed (RULES.md §9). The tracking token is stored only as a hash.
 */
const bookingSchema = new mongoose.Schema(
  {
    patientName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    pickupLocation: { type: pointSchema, default: undefined },
    pickupLabel: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: MAX_BOOKING_NOTES_LENGTH, default: '' },
    condition: { type: String, enum: CONDITION_VALUES, required: true },
    urgency: { type: String, enum: URGENCY_VALUES, default: DEFAULT_URGENCY },
    status: { type: String, enum: BOOKING_STATUS_VALUES, default: BOOKING_STATUS.FINDING_AMBULANCE },
    /** sha256 of the tracking token; the token itself is shown once and never stored. */
    trackingTokenHash: { type: String, default: undefined },
    /** Set to the phone while the booking is active: the unique index allows one per number. */
    activePhone: { type: String, default: undefined },
    currentOfferId: { type: ObjectId, ref: 'AmbulanceOffer', default: null },
    /** Ambulances already offered this booking in the current round (never offered twice). */
    contactedAmbulanceIds: { type: [{ type: ObjectId, ref: 'User' }], default: [] },
    ambulanceId: { type: ObjectId, ref: 'User', default: null },
    emergencyId: { type: ObjectId, ref: 'EmergencyRequest', default: null },
    /** Who cancelled and why (the caller's tracking page shows it). */
    cancelledBy: { type: String, enum: [...Object.values(CANCELLED_BY), null], default: null },
    cancelReason: { type: String, enum: [...CANCEL_REASON_VALUES, null], default: null },
    cancelNote: { type: String, trim: true, maxlength: MAX_CANCEL_NOTE_LENGTH, default: '' },
    assignedAt: { type: Date, default: null },
    onTheWayAt: { type: Date, default: null },
    atPickupAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    piiPurgedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: jsonOptions({ pickupLocation: 'pickup' }) }
);

bookingSchema.index(
  { trackingTokenHash: 1 },
  { unique: true, partialFilterExpression: { trackingTokenHash: { $type: 'string' } }, name: 'unique_tracking_token' }
);
bookingSchema.index(
  { activePhone: 1 },
  { unique: true, partialFilterExpression: { activePhone: { $type: 'string' } }, name: 'one_active_booking_per_phone' }
);
bookingSchema.index({ phone: 1, createdAt: -1 });
bookingSchema.index({ ambulanceId: 1, status: 1 });
bookingSchema.index({ status: 1, closedAt: 1 });
bookingSchema.index({ emergencyId: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
