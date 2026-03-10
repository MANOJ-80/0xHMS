import { describe, it, expect, beforeAll } from 'vitest'
import { Notification } from '../models/Notification.js'
import { api, seedAdmin, seedDepartment, seedDoctor, seedPatient, seedReceptionist, tokenFor } from './helpers.js'

describe('Notification API', () => {
  let admin, adminToken
  let receptionist, receptionistToken
  let patient, department, doctorData

  beforeAll(async () => {
    department = await seedDepartment()
    admin = await seedAdmin()
    adminToken = tokenFor(admin)
    receptionist = await seedReceptionist()
    receptionistToken = tokenFor(receptionist)
    patient = await seedPatient()
    doctorData = await seedDoctor(department._id)
  })

  // ── Manual send ────────────────────────────────────────────────────────

  describe('POST /api/v1/notifications/send', () => {
    it('should allow admin to send a manual notification', async () => {
      const res = await api()
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: patient._id.toString(),
          type: 'general',
          channel: 'system',
          recipient: patient.phone,
          subject: 'Test notification',
          message: 'Hello from test',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.notification).toBeDefined()
      expect(res.body.data.notification.message).toBe('Hello from test')
      expect(res.body.data.notification.status).toBe('sent')
    })

    it('should allow receptionist to send a manual notification', async () => {
      const res = await api()
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patientId: patient._id.toString(),
          type: 'general',
          channel: 'sms',
          recipient: patient.phone,
          message: 'Receptionist test notification',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.notification.channel).toBe('sms')
    })

    it('should reject when missing required fields', async () => {
      const res = await api()
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ patientId: patient._id.toString() }) // missing message and recipient

      expect(res.status).toBe(400)
    })

    it('should reject unauthenticated requests', async () => {
      const res = await api()
        .post('/api/v1/notifications/send')
        .send({ patientId: patient._id.toString(), recipient: '1234', message: 'test' })

      expect(res.status).toBe(401)
    })
  })

  // ── List / Get ─────────────────────────────────────────────────────────

  describe('GET /api/v1/notifications', () => {
    it('should list all notifications for admin', async () => {
      const res = await api()
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.notifications)).toBe(true)
      // We sent at least 2 notifications above
      expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by patientId', async () => {
      const res = await api()
        .get(`/api/v1/notifications?patientId=${patient._id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      for (const n of res.body.data.notifications) {
        expect(n.patientId._id || n.patientId).toBe(patient._id.toString())
      }
    })
  })

  describe('GET /api/v1/notifications/:id', () => {
    it('should return a single notification by ID', async () => {
      const notif = await Notification.findOne()
      if (!notif) return // skip if DB is empty somehow

      const res = await api()
        .get(`/api/v1/notifications/${notif._id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.notification._id).toBe(notif._id.toString())
    })

    it('should return 404 for non-existent notification', async () => {
      const fakeId = '6600000000000000000a0001'
      const res = await api()
        .get(`/api/v1/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(404)
    })
  })

  // ── Stats ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/notifications/stats', () => {
    it('should return notification stats for admin', async () => {
      const res = await api()
        .get('/api/v1/notifications/stats')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.stats).toBeDefined()
      expect(typeof res.body.data.stats.total).toBe('number')
      expect(typeof res.body.data.stats.sent).toBe('number')
      expect(typeof res.body.data.stats.failed).toBe('number')
      expect(typeof res.body.data.stats.pending).toBe('number')
    })

    it('should reject non-admin access to stats', async () => {
      const res = await api()
        .get('/api/v1/notifications/stats')
        .set('Authorization', `Bearer ${receptionistToken}`)

      expect(res.status).toBe(403)
    })
  })

  // ── Retry ──────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/notifications/:id/retry', () => {
    it('should reject retry of a non-failed notification', async () => {
      const sentNotif = await Notification.findOne({ status: 'sent' })
      if (!sentNotif) return

      const res = await api()
        .patch(`/api/v1/notifications/${sentNotif._id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)

      // Only failed notifications can be retried; sent notifications are rejected
      expect(res.status).toBe(400)
    })
  })
})
