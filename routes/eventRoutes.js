const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { getCollections } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { sampleEvents } = require('../data/sampleEvents');

const JWT_SECRET = process.env.JWT_SECRET || 'healthconnect_super_secret_jwt_key_2026';

// Helper to get optional user from auth header if present
const getOptionalUser = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
  return null;
};

// 1. Seed events endpoint (convenient for setup & initial testing)
router.post('/seed', async (req, res) => {
  try {
    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }
    const { eventsCollection } = collections;
    const count = await eventsCollection.countDocuments();
    if (count > 0 && !req.query.force) {
      return res.json({
        success: true,
        message: `Database already contains ${count} events. Use ?force=true to re-seed.`,
      });
    }

    if (req.query.force) {
      await eventsCollection.deleteMany({});
    }

    const result = await eventsCollection.insertMany(sampleEvents);
    return res.status(201).json({
      success: true,
      message: `Successfully seeded ${result.insertedCount} HealthConnect events!`,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ success: false, message: 'Failed to seed events' });
  }
});

// 2. GET /api/events - Public endpoint for upcoming events
// Requirement: "Show 6 recent upcoming events (using .limit() operator of mongodb) based on date"
// Requirement: "Keep in mind that this page will only show upcoming events. Events whose dates have passed must not appear on this page."
router.get('/', async (req, res) => {
  try {
    const collections = getCollections();
    if (!collections) {
      // In-memory fallback if DB not connected yet
      return res.json({ success: true, events: sampleEvents.slice(0, 6) });
    }

    const { eventsCollection } = collections;
    const { limit, category, search } = req.query;

    const now = new Date();
    // Filter to ensure only upcoming events (dates in the future or today)
    const query = {
      eventDate: { $gte: now.toISOString().split('T')[0] },
    };

    if (category && category !== 'All') {
      query.eventType = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    let cursor = eventsCollection.find(query).sort({ eventDate: 1 });

    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        cursor = cursor.limit(parsedLimit);
      }
    }

    const events = await cursor.toArray();

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

// 3. GET /api/events/manage/my-events - Protected
// Requirement: "user will be able to see all events created by them"
router.get('/manage/my-events', verifyToken, async (req, res) => {
  try {
    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { eventsCollection } = collections;
    const userEmail = req.user.email.toLowerCase();

    const myEvents = await eventsCollection
      .find({ organizerEmail: userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: myEvents.length,
      events: myEvents,
    });
  } catch (error) {
    console.error('Get my-events error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user events' });
  }
});

// 4. GET /api/events/joined/my-joined - Protected
// Requirement: "This page will show all events joined by the logged-in user. Show events sorted by event date."
router.get('/joined/my-joined', verifyToken, async (req, res) => {
  try {
    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { joinedEventsCollection } = collections;
    const userEmail = req.user.email.toLowerCase();

    const joined = await joinedEventsCollection
      .find({ userEmail })
      .sort({ eventDate: 1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: joined.length,
      joinedEvents: joined,
    });
  } catch (error) {
    console.error('Get my joined events error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch joined events' });
  }
});

// 5. GET /api/events/:id - Public
// Requirement: "The event details page is not a private page. Users can see the details page without logging in."
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { eventsCollection, joinedEventsCollection } = collections;
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if the current requesting user has already joined (if logged in)
    let isJoined = false;
    const optionalUser = getOptionalUser(req);
    if (optionalUser && optionalUser.email) {
      const existingJoin = await joinedEventsCollection.findOne({
        eventId: id,
        userEmail: optionalUser.email.toLowerCase(),
      });
      isJoined = !!existingJoin;
    }

    return res.status(200).json({
      success: true,
      event,
      isJoined,
    });
  } catch (error) {
    console.error('Get event details error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch event details' });
  }
});

// 6. POST /api/events - Protected
// Requirement: "Ensure that no past date can be added. The date must be in the future."
// Requirement: "keep the user email with the event data of the person creating the event"
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, eventType, thumbnail, location, eventDate } = req.body;

    // Validation
    if (!title || !description || !eventType || !thumbnail || !location || !eventDate) {
      return res.status(400).json({
        success: false,
        message: 'All fields (title, description, eventType, thumbnail, location, eventDate) are required.',
      });
    }

    // Check future date
    const selectedDate = new Date(eventDate);
    const now = new Date();
    if (isNaN(selectedDate.getTime()) || selectedDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Event date must be in the future. Past or current times are not permitted.',
      });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { eventsCollection } = collections;

    const newEvent = {
      title: title.trim(),
      description: description.trim(),
      eventType: eventType.trim(),
      thumbnail: thumbnail.trim(),
      location: location.trim(),
      eventDate: selectedDate.toISOString(),
      organizerEmail: req.user.email.toLowerCase(),
      organizerName: req.user.name || 'HealthConnect Organizer',
      participantsCount: 0,
      createdAt: new Date().toISOString(),
    };

    const result = await eventsCollection.insertOne(newEvent);

    return res.status(201).json({
      success: true,
      message: 'Event created successfully!',
      eventId: result.insertedId.toString(),
      event: { ...newEvent, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create event' });
  }
});

// 7. PUT /api/events/:id - Protected
// Requirement: "Users can only delete and update their own created event data."
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const { title, description, eventType, thumbnail, location, eventDate } = req.body;

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { eventsCollection } = collections;
    const existingEvent = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!existingEvent) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Authorization check
    if (existingEvent.organizerEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only update events you created yourself.',
      });
    }

    // Future date validation if date is being updated
    if (eventDate) {
      const selectedDate = new Date(eventDate);
      const now = new Date();
      if (isNaN(selectedDate.getTime()) || selectedDate <= now) {
        return res.status(400).json({
          success: false,
          message: 'Updated event date must be in the future. Past dates are not allowed.',
        });
      }
    }

    const updatedData = {
      ...(title && { title: title.trim() }),
      ...(description && { description: description.trim() }),
      ...(eventType && { eventType: eventType.trim() }),
      ...(thumbnail && { thumbnail: thumbnail.trim() }),
      ...(location && { location: location.trim() }),
      ...(eventDate && { eventDate: new Date(eventDate).toISOString() }),
      updatedAt: new Date().toISOString(),
    };

    await eventsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully!',
    });
  } catch (error) {
    console.error('Update event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update event' });
  }
});

// 8. DELETE /api/events/:id - Protected
// Requirement: "Users can only delete and update their own created event data."
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { eventsCollection, joinedEventsCollection } = collections;
    const existingEvent = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!existingEvent) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Authorization check
    if (existingEvent.organizerEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete events you created yourself.',
      });
    }

    await eventsCollection.deleteOne({ _id: new ObjectId(id) });
    // Also clean up registrations for this event
    await joinedEventsCollection.deleteMany({ eventId: id });

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully!',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
});

// 9. POST /api/events/:id/join - Protected
// Requirement: "Users will be able to join an event by clicking the Join Event button, and it must be functional. When a user joins an event, store the data in the database along with the event and user data."
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { eventsCollection, joinedEventsCollection } = collections;
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const userEmail = req.user.email.toLowerCase();

    // Prevent duplicate joining
    const alreadyJoined = await joinedEventsCollection.findOne({
      eventId: id,
      userEmail,
    });

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this event!',
      });
    }

    const joinRecord = {
      eventId: id,
      eventTitle: event.title,
      eventType: event.eventType,
      location: event.location,
      thumbnail: event.thumbnail,
      eventDate: event.eventDate,
      organizerName: event.organizerName,
      userEmail,
      userName: req.user.name || 'HealthConnect Volunteer',
      userId: req.user.id,
      joinedAt: new Date().toISOString(),
    };

    await joinedEventsCollection.insertOne(joinRecord);

    // Increment participants counter
    await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { participantsCount: 1 } }
    );

    return res.status(201).json({
      success: true,
      message: 'You have successfully joined the event! Thank you for participating.',
      joinedEvent: joinRecord,
    });
  } catch (error) {
    console.error('Join event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to join event' });
  }
});

// 10. DELETE /api/events/joined/:joinId - Protected (Optional helper to cancel registration)
router.delete('/joined/:joinId', verifyToken, async (req, res) => {
  try {
    const { joinId } = req.params;
    if (!ObjectId.isValid(joinId)) {
      return res.status(400).json({ success: false, message: 'Invalid join registration ID' });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { eventsCollection, joinedEventsCollection } = collections;
    const record = await joinedEventsCollection.findOne({ _id: new ObjectId(joinId) });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (record.userEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this registration' });
    }

    await joinedEventsCollection.deleteOne({ _id: new ObjectId(joinId) });

    if (record.eventId && ObjectId.isValid(record.eventId)) {
      await eventsCollection.updateOne(
        { _id: new ObjectId(record.eventId) },
        { $inc: { participantsCount: -1 } }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Registration canceled successfully.',
    });
  } catch (error) {
    console.error('Cancel join error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel registration' });
  }
});

module.exports = router;

