import mongoose from 'mongoose';
import { AMBULANCE_TYPE_VALUES } from '../constants/ambulance.js';
import { ROLES, ROLE_VALUES } from '../constants/roles.js';
import { jsonOptions } from './plugins/toJSON.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, required: true },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
      validate: {
        // required iff role = HOSPITAL (ARCHITECTURE.md §6.1)
        validator(value) {
          return this.role === ROLES.HOSPITAL ? value != null : value == null;
        },
        message: 'hospitalId is required for HOSPITAL users and must be empty otherwise',
      },
    },
    isActive: { type: Boolean, default: true },
    phone: { type: String, trim: true, default: '' },
    /** Ambulance crew (role DISPATCHER) registration details. */
    ambulance: {
      type: new mongoose.Schema(
        {
          vehicleNumber: { type: String, trim: true, uppercase: true, required: true },
          ambulanceType: { type: String, enum: AMBULANCE_TYPE_VALUES, required: true },
          organization: { type: String, trim: true, default: '' },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { timestamps: true, toJSON: jsonOptions() }
);

userSchema.index(
  { 'ambulance.vehicleNumber': 1 },
  {
    unique: true,
    partialFilterExpression: { 'ambulance.vehicleNumber': { $type: 'string' } },
    name: 'unique_ambulance_vehicle',
  }
);

export const User = mongoose.model('User', userSchema);
