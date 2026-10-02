import { User } from '../models/index.js';

export const userRepo = {
  findById: (id) => User.findById(id),
  findByEmailWithPassword: (email) => User.findOne({ email: email.toLowerCase() }).select('+passwordHash'),
  existsByEmail: (email) => User.exists({ email: email.toLowerCase() }),
  list: (filter = {}) => User.find(filter).sort({ role: 1, name: 1 }),
  create: (data) => User.create(data),
  updateById: (id, update) => User.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: false }),
  findHospitalStaff: (hospitalId) => User.find({ hospitalId, isActive: true }),
};
