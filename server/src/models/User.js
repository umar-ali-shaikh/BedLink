import mongoose from 'mongoose';
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
  },
  { timestamps: true, toJSON: jsonOptions() }
);

export const User = mongoose.model('User', userSchema);
