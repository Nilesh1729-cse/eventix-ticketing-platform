import express from 'express';
import { catalogService } from './catalogService.js';
import { requireAuth, requireRole } from '../auth-service/authRoutes.js';
import { faultInjector } from '../../resilience/FaultInjector.js';

export const catalogRouter = express.Router();

catalogRouter.get('/', async (req, res) => {
  try {
    await faultInjector.simulate('catalogService');
    const { category, city, search } = req.query;
    const events = catalogService.getAllEvents({ category, city, search });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

catalogRouter.get('/:id', async (req, res) => {
  try {
    await faultInjector.simulate('catalogService');
    const event = catalogService.getEventById(req.params.id);
    res.json(event);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

catalogRouter.post('/', requireAuth, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    await faultInjector.simulate('catalogService');
    const newEvent = catalogService.createEvent(req.body, req.user.userId);
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

catalogRouter.get('/:id/seats', async (req, res) => {
  try {
    await faultInjector.simulate('catalogService');
    const currentUserId = req.query.userId || (req.user ? req.user.userId : null);
    const currentTerminalId = req.headers['x-terminal-id'] || req.query.terminalId;
    const seats = catalogService.getEventSeatsWithLiveLocks(req.params.id, currentUserId, currentTerminalId);
    res.json(seats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
