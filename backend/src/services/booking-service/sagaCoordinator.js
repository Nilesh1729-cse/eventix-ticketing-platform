import { v4 as uuidv4 } from 'uuid';
import { db } from '../../data/database.js';
import { lockManager } from '../../resilience/DistributedLock.js';
import { pricingService } from '../pricing-service/pricingService.js';
import { eventBus } from '../../event-bus/EventBus.js';
import { CircuitBreaker } from '../../resilience/CircuitBreaker.js';
import { faultInjector } from '../../resilience/FaultInjector.js';

// Payment gateway circuit breaker
export const paymentCircuitBreaker = new CircuitBreaker('PaymentGateway', {
  failureThreshold: 3,
  resetTimeout: 8000,
  halfOpenSuccessThreshold: 2
});

export class BookingSagaCoordinator {
  /**
   * Execute the distributed Saga for purchasing a ticket.
   * Step 1: Verify & maintain distributed seat lock
   * Step 2: Calculate & freeze dynamic price
   * Step 3: Authorize payment (via Circuit Breaker & simulated payment gateway)
   * Step 4: Finalize booking, persist ticket, mark seat SOLD
   * Rollback: Release seat lock, emit failure event if step 3 or 4 fails
   */
  async executeBookingSaga({ eventId, seatId, user, terminalInfo, paymentMethod = 'CARD' }) {
    const sagaId = `saga-${uuidv4()}`;
    const sagaSteps = [];
    const lockKey = `seat:${eventId}:${seatId}`;
    const ownerId = `${user.userId}:${terminalInfo.terminalId}`;

    const recordStep = (stepName, status, details = {}) => {
      sagaSteps.push({
        step: stepName,
        status, // 'SUCCESS', 'FAILED', 'COMPENSATING', 'ROLLED_BACK'
        timestamp: new Date().toISOString(),
        details
      });
    };

    console.log(`[SagaCoordinator:${sagaId}] Starting booking saga for ${user.email} on ${lockKey}`);

    try {
      // ----------------------------------------------------
      // STEP 1: Concurrency Shield & Seat Lock Verification
      // ----------------------------------------------------
      const existingSeat = (db.seats.get(eventId) || []).find(s => s.id === seatId);
      if (!existingSeat) {
        throw new Error(`Seat '${seatId}' not found in event venue.`);
      }
      if (existingSeat.status === 'SOLD') {
        throw new Error(`Seat '${seatId}' has already been sold.`);
      }

      // Check or acquire lock
      const lockResult = lockManager.acquire(lockKey, ownerId, 5 * 60 * 1000, {
        userId: user.userId,
        terminalId: terminalInfo.terminalId,
        terminalLabel: terminalInfo.terminalLabel,
        seatId,
        eventId
      });

      if (!lockResult.success) {
        recordStep('ACQUIRE_SEAT_LOCK', 'FAILED', { reason: lockResult.error });
        throw new Error(lockResult.error || 'Seat is currently reserved by another terminal.');
      }
      recordStep('ACQUIRE_SEAT_LOCK', 'SUCCESS', { lockKey, ownerId });

      // ----------------------------------------------------
      // STEP 2: Freeze Dynamic Price
      // ----------------------------------------------------
      let priceQuote;
      try {
        priceQuote = pricingService.calculateSeatPrice(eventId, seatId);
      } catch (err) {
        priceQuote = {
          basePrice: existingSeat.basePrice,
          finalPrice: existingSeat.basePrice,
          isDynamic: false,
          breakdown: { base: existingSeat.basePrice, totalAdjustment: 0 },
          reasons: ['Base tier price applied']
        };
      }
      recordStep('LOCK_DYNAMIC_PRICE', 'SUCCESS', {
        price: priceQuote.finalPrice,
        breakdown: priceQuote.breakdown
      });

      // ----------------------------------------------------
      // STEP 3: Process Payment (Protected by Circuit Breaker)
      // ----------------------------------------------------
      let paymentResult;
      try {
        paymentResult = await paymentCircuitBreaker.execute(async () => {
          await faultInjector.simulate('paymentService');
          
          // Simulated payment authorization
          return {
            transactionId: `txn-${uuidv4()}`,
            amount: priceQuote.finalPrice,
            currency: 'USD',
            status: 'AUTHORIZED',
            timestamp: new Date().toISOString()
          };
        });
        recordStep('PROCESS_PAYMENT', 'SUCCESS', paymentResult);
      } catch (paymentError) {
        recordStep('PROCESS_PAYMENT', 'FAILED', { error: paymentError.message });
        throw new Error(`Payment authorization failed: ${paymentError.message}`);
      }

      // ----------------------------------------------------
      // STEP 4: Finalize Ticket Issuance & State Persistence
      // ----------------------------------------------------
      const bookingId = `bk-${uuidv4().substring(0, 8).toUpperCase()}`;
      const ticketId = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const event = db.events.get(eventId);

      // Mark seat as permanently SOLD
      existingSeat.status = 'SOLD';
      existingSeat.bookedBy = user.userId;
      existingSeat.bookedAt = new Date().toISOString();

      // Release the temporary reservation lock
      lockManager.release(lockKey, ownerId, true);

      const bookingRecord = {
        bookingId,
        ticketId,
        sagaId,
        eventId,
        eventTitle: event?.title,
        eventDate: event?.date,
        venueName: event?.venueName,
        city: event?.city,
        seatId,
        seatRow: existingSeat.row,
        seatNumber: existingSeat.number,
        tierId: existingSeat.tierId,
        user: {
          id: user.userId,
          name: user.name,
          email: user.email
        },
        terminal: {
          terminalId: terminalInfo.terminalId,
          terminalLabel: terminalInfo.terminalLabel
        },
        pricing: {
          basePrice: priceQuote.basePrice,
          finalPrice: priceQuote.finalPrice,
          breakdown: priceQuote.breakdown,
          isDynamic: priceQuote.isDynamic
        },
        payment: paymentResult,
        status: 'CONFIRMED',
        qrPayload: JSON.stringify({
          ticketId,
          bookingId,
          event: event?.title,
          seat: seatId,
          user: user.email,
          issuedAt: new Date().toISOString()
        }),
        createdAt: new Date().toISOString(),
        sagaSteps
      };

      db.bookings.set(bookingId, bookingRecord);

      // Record in pricing service for velocity telemetry
      pricingService.recordBooking(eventId);

      // Notify the system via Event Bus
      await eventBus.publish('BookingConfirmed', {
        bookingId,
        ticketId,
        eventId,
        seatId,
        userId: user.userId,
        amount: priceQuote.finalPrice,
        terminalId: terminalInfo.terminalId,
        timestamp: bookingRecord.createdAt
      }, 'SagaCoordinator');

      recordStep('FINALIZE_TICKET', 'SUCCESS', { bookingId, ticketId });

      return {
        success: true,
        booking: bookingRecord
      };

    } catch (sagaError) {
      console.warn(`[SagaCoordinator:${sagaId}] Saga failed! Initiating compensating rollback. Error: ${sagaError.message}`);

      // COMPENSATING TRANSACTION:
      // Release distributed seat lock so seat becomes available again
      lockManager.release(lockKey, ownerId, true);
      recordStep('COMPENSATING_RELEASE_LOCK', 'COMPENSATING', {
        lockKey,
        ownerId,
        reason: sagaError.message
      });

      eventBus.publish('BookingFailed', {
        sagaId,
        eventId,
        seatId,
        userId: user.userId,
        error: sagaError.message,
        steps: sagaSteps
      }, 'SagaCoordinator');

      throw new Error(`Booking transaction could not be completed: ${sagaError.message}`);
    }
  }
}

export const sagaCoordinator = new BookingSagaCoordinator();
