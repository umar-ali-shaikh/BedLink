import mongoose from 'mongoose';
import { BED_STATUS, BED_STATUS_VALUES, BED_TYPE_VALUES, EQUIPMENT_VALUES } from '../constants/bed.js';
import { jsonOptions } from './plugins/toJSON.js';

const bedSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: BED_TYPE_VALUES, required: true },
    equipment: { type: [{ type: String, enum: EQUIPMENT_VALUES }], default: [] },
    status: { type: String, enum: BED_STATUS_VALUES, default: BED_STATUS.AVAILABLE },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  // updatedAt is the freshness source (ARCHITECTURE.md §6.3)
  { timestamps: true, toJSON: jsonOptions() }
);

bedSchema.index({ hospitalId: 1, type: 1, status: 1 });
bedSchema.index({ hospitalId: 1, label: 1 }, { unique: true });

export const Bed = mongoose.model('Bed', bedSchema);
