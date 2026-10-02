import { Notification } from '../models/index.js';

export const notificationRepo = {
  create: (data) => Notification.create(data),
  findById: (id) => Notification.findById(id),
  listFor: ({ userId, hospitalId, unreadOnly, limit = 50 }) => {
    const owners = [{ userId }];
    if (hospitalId) owners.push({ hospitalId });
    const filter = { $or: owners };
    if (unreadOnly) filter.readAt = null;
    return Notification.find(filter).sort({ createdAt: -1 }).limit(limit);
  },
  markRead: (id) =>
    Notification.findOneAndUpdate(
      { _id: id, readAt: null },
      { $set: { readAt: new Date() } },
      { returnDocument: 'after' }
    ),
};
