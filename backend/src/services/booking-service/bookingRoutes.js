import express from 'express';
import { bookingService } from './bookingService.js';
import { requireAuth } from '../auth-service/authRoutes.js';
import { paymentCircuitBreaker } from './sagaCoordinator.js';
import { lockManager } from '../../resilience/DistributedLock.js';

export const bookingRouter = express.Router();

// Hold a seat temporarily during seat selection
bookingRouter.post('/hold', requireAuth, (req, res) => {
  try {
    const { eventId, seatId, terminalLabel } = req.body;
    if (!eventId || !seatId) {
      return res.status(400).json({ error: 'eventId and seatId are required.' });
    }

    const terminalId = req.user.terminalId || req.headers['x-terminal-id'] || 'default-term';
    const result = bookingService.holdSeat({
      eventId,
      seatId,
      userId: req.user.userId,
      terminalId,
      terminalLabel: terminalLabel || 'Web Terminal'
    });

    res.json(result);
  } catch (err) {
    res.status(409).json({ error: err.message }); // 409 Conflict when already locked
  }
});

// Release a held seat
bookingRouter.post('/release', requireAuth, (req, res) => {
  try {
    const { eventId, seatId } = req.body;
    const terminalId = req.user.terminalId || req.headers['x-terminal-id'] || 'default-term';
    const result = bookingService.releaseHold({
      eventId,
      seatId,
      userId: req.user.userId,
      terminalId
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Execute Booking Saga Checkout
bookingRouter.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { eventId, seatId, paymentMethod, terminalLabel } = req.body;
    if (!eventId || !seatId) {
      return res.status(400).json({ error: 'eventId and seatId are required for checkout.' });
    }

    const terminalInfo = {
      terminalId: req.user.terminalId || req.headers['x-terminal-id'] || 'default-term',
      terminalLabel: terminalLabel || 'Web Terminal'
    };

    const result = await bookingService.checkout({
      eventId,
      seatId,
      user: req.user,
      terminalInfo,
      paymentMethod
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

// Get user's purchased tickets
bookingRouter.get('/my-bookings', requireAuth, (req, res) => {
  const bookings = bookingService.getUserBookings(req.user.userId);
  res.json(bookings);
});

// Get single booking
bookingRouter.get('/:bookingId', requireAuth, (req, res) => {
  try {
    const booking = bookingService.getBookingById(req.params.bookingId);
    res.json(booking);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Resilience & Lock Telemetry
bookingRouter.get('/resilience/status', (req, res) => {
  res.json({
    paymentCircuitBreaker: paymentCircuitBreaker.getStatus(),
    activeLocks: lockManager.getAllActiveLocks()
  });
});
