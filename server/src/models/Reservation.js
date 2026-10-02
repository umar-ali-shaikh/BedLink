import mongoose from 'mongoose';
import { RESERVATION_STATUS, RESERVATION_STATUS_VALUES } from '../constants/reservation.js';
import { jsonOptions } from './plugins/toJSON.js';

const { ObjectId } = mongoose.Schema.Types;

const reservationSchema = new mongoose.Schema(
  {
    requestId: { type: ObjectId, ref: 'EmergencyRequest', required: true, index: true },
    hospitalRequestId: { type: ObjectId, ref: 'HospitalRequest', default: null },
    hospitalId: { type: ObjectId, ref: 'Hospital', required: true, index: true },
    bedId: { type: ObjectId, ref: 'Bed', required: true },
    status: { type: String, enum: RESERVATION_STATUS_VALUES, default: RESERVATION_STATUS.ACTIVE },
    expiresAt: { type: Date, required: true },
    createdBy: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: jsonOptions() }
);

const activeOnly = { partialFilterExpression: { status: RESERVATION_STATUS.ACTIVE } };

// Secondary double-booking guard (ARCHITECTURE.md §13.2).
reservationSchema.index({ bedId: 1 }, { unique: true, ...activeOnly, name: 'one_active_reservation_per_bed' });
reservationSchema.index({ requestId: 1 }, { unique: true, ...activeOnly, name: 'one_active_reservation_per_request' });
reservationSchema.index({ status: 1, expiresAt: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);
