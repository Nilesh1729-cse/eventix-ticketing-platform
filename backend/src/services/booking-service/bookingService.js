import { db } from '../../data/database.js';
import { lockManager } from '../../resilience/DistributedLock.js';
import { sagaCoordinator } from './sagaCoordinator.js';

export class BookingService {
  holdSeat({ eventId, seatId, userId, terminalId, terminalLabel }) {
    const event = db.events.get(eventId);
    if (!event) {
      throw new Error(`Event with id '${eventId}' not found.`);
    }

    const seats = db.seats.get(eventId) || [];
    const seat = seats.find(s => s.id === seatId);
    if (!seat) {
      throw new Error(`Seat '${seatId}' does not exist.`);
    }

    if (seat.status === 'SOLD') {
      throw new Error(`Seat '${seatId}' has already been booked.`);
    }

    const lockKey = `seat:${eventId}:${seatId}`;
    const ownerId = `${userId}:${terminalId}`;

    const lockResult = lockManager.acquire(lockKey, ownerId, 5 * 60 * 1000, {
      userId,
      terminalId,
      terminalLabel: terminalLabel || 'Web Terminal',
      seatId,
      eventId
    });

    if (!lockResult.success) {
      throw new Error(lockResult.error || 'Seat is currently reserved by another terminal.');
    }

    return {
      success: true,
      lock: lockResult.lock,
      remainingSeconds: Math.ceil((lockResult.lock.expiresAt - Date.now()) / 1000)
    };
  }

  releaseHold({ eventId, seatId, userId, terminalId }) {
    const lockKey = `seat:${eventId}:${seatId}`;
    const ownerId = `${userId}:${terminalId}`;
    return lockManager.release(lockKey, ownerId);
  }

  async checkout({ eventId, seatId, user, terminalInfo, paymentMethod }) {
    return await sagaCoordinator.executeBookingSaga({
      eventId,
      seatId,
      user,
      terminalInfo,
      paymentMethod
    });
  }

  getUserBookings(userId) {
    const bookings = [];
    for (const bk of db.bookings.values()) {
      if (bk.user.id === userId) {
        bookings.push(bk);
      }
    }
    return bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getBookingById(bookingId) {
    const bk = db.bookings.get(bookingId);
    if (!bk) {
      throw new Error(`Booking '${bookingId}' not found.`);
    }
    return bk;
  }
}

export const bookingService = new BookingService();
