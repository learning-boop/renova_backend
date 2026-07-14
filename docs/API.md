# Kensley Aesthetics — Complete API Reference
**Base URL (local):** `http://localhost:5000`
**Base URL (production):** _(your deployed domain)_

**Admin Panel:** `http://localhost:5000/admin/admin.html`

---

## All Endpoints at a Glance

### Public (no authentication required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Check server is running |
| `POST` | `/api/contact` | Submit contact/enquiry form |
| `POST` | `/api/appointments` | Book an appointment |
| `POST` | `/api/chat/message` | Send a chat message, receive AI reply |

### Admin (requires `Authorization: Bearer ADMIN_API_KEY`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/contact` | List all contact submissions |
| `PATCH` | `/api/contact/:id/status` | Update contact status |
| `GET` | `/api/appointments` | List all appointments |
| `GET` | `/api/appointments/:id` | Get a single appointment |
| `PATCH` | `/api/appointments/:id/status` | Update appointment status |
| `DELETE` | `/api/appointments/:id` | Delete an appointment |

---

## Authentication

Admin endpoints require this header on every request:

```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

Missing or wrong key → `401 Unauthorised`
Key not configured on server → `503 Admin access not configured`

---

## 1. Health Check

**`GET /health`**

```bash
curl http://localhost:5000/health
```

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-14T10:00:00.000Z"
}
```

---

## 2. Contact / Enquiry Form

Called when a client submits the contact or enquiry form. Saved to the `contacts` table in the database. Visible in the Admin Panel.

**`POST /api/contact`**

**Headers:**
```
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "Sarah Johnson",
  "email": "sarah@example.com",
  "phone": "07700900123",
  "service": "Smooth Lines",
  "message": "I would like to find out more about anti-wrinkle injections."
}
```

| Field | Required | Rules |
|---|---|---|
| `name` | Yes | Max 150 characters |
| `email` | Yes | Valid email format |
| `message` | Yes | Max 5000 characters |
| `phone` | No | Optional |
| `service` | No | Optional — treatment the client is enquiring about |

```bash
curl -X POST http://localhost:5000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Johnson",
    "email": "sarah@example.com",
    "phone": "07700900123",
    "service": "Smooth Lines",
    "message": "I would like to find out more."
  }'
```

**Response `201`:**
```json
{
  "success": true,
  "id": "a1b2c3d4-...",
  "message": "Thank you! We'll be in touch soon."
}
```

**Error responses:**
| Status | Message | Cause |
|---|---|---|
| `400` | `Name, email, and message are required.` | Missing required field |
| `400` | `Invalid email address.` | Bad email format |
| `400` | `Message is too long. Maximum 5000 characters.` | Message too long |
| `429` | `Too many submissions. Please try again later.` | 10 submissions/hour per IP |
| `500` | `Something went wrong. Please try again.` | Server/database error |

---

## 3. Appointments

Called when a client books an appointment. Saved to the `appointments` table. Visible in the Admin Panel.

### Book an appointment

**`POST /api/appointments`**

**Headers:**
```
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "Emily Clarke",
  "email": "emily@example.com",
  "phone": "07911123456",
  "service": "Face Sculpt",
  "preferred_date": "2025-02-10",
  "preferred_time": "14:00",
  "notes": "First time client, would like to discuss options."
}
```

| Field | Required | Rules |
|---|---|---|
| `name` | Yes | Max 150 characters |
| `email` | Yes | Valid email format |
| `service` | Yes | Treatment being booked |
| `preferred_date` | Yes | Format: `YYYY-MM-DD`. Cannot be in the past. |
| `preferred_time` | Yes | e.g. `09:00`, `14:30`, `Morning`, `Afternoon` |
| `phone` | No | Optional |
| `notes` | No | Any additional notes from the client |

```bash
curl -X POST http://localhost:5000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emily Clarke",
    "email": "emily@example.com",
    "phone": "07911123456",
    "service": "Face Sculpt",
    "preferred_date": "2025-02-10",
    "preferred_time": "14:00",
    "notes": "First time client."
  }'
```

**Response `201`:**
```json
{
  "success": true,
  "id": "b2c3d4e5-...",
  "message": "Your appointment request has been received. We'll confirm shortly."
}
```

**Error responses:**
| Status | Message | Cause |
|---|---|---|
| `400` | `Name, email, service, preferred_date, and preferred_time are required.` | Missing required field |
| `400` | `Invalid email address.` | Bad email format |
| `400` | `preferred_date must be in YYYY-MM-DD format.` | Wrong date format |
| `400` | `preferred_date cannot be in the past.` | Past date submitted |
| `429` | `Too many booking requests. Please try again later.` | 10 bookings/hour per IP |
| `500` | `Something went wrong. Please try again.` | Server/database error |

---

### List all appointments (admin)

**`GET /api/appointments`**

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

**Optional query params:**
| Param | Description | Default |
|---|---|---|
| `status` | Filter: `pending`, `confirmed`, `cancelled`, `completed` | All |
| `date` | Filter by specific date: `YYYY-MM-DD` | All |
| `limit` | Max results | `50` (max `200`) |
| `offset` | Pagination offset | `0` |

```bash
# All appointments
curl http://localhost:5000/api/appointments \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"

# Only pending
curl "http://localhost:5000/api/appointments?status=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"

# By date
curl "http://localhost:5000/api/appointments?date=2025-02-10" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

**Response `200`:**
```json
{
  "data": [
    {
      "id": "b2c3d4e5-...",
      "name": "Emily Clarke",
      "email": "emily@example.com",
      "phone": "07911123456",
      "service": "Face Sculpt",
      "preferred_date": "2025-02-10",
      "preferred_time": "14:00",
      "notes": "First time client.",
      "status": "pending",
      "created_at": "2025-01-14T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Get a single appointment (admin)

**`GET /api/appointments/:id`**

```bash
curl http://localhost:5000/api/appointments/b2c3d4e5-... \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

**Response `200`:**
```json
{
  "data": {
    "id": "b2c3d4e5-...",
    "name": "Emily Clarke",
    "email": "emily@example.com",
    "phone": "07911123456",
    "service": "Face Sculpt",
    "preferred_date": "2025-02-10",
    "preferred_time": "14:00",
    "notes": "First time client.",
    "status": "pending",
    "created_at": "2025-01-14T10:00:00.000Z"
  }
}
```

**Error responses:**
| Status | Message | Cause |
|---|---|---|
| `401` | `Unauthorised.` | Wrong or missing API key |
| `404` | `Appointment not found.` | ID does not exist |

---

### Update appointment status (admin)

**`PATCH /api/appointments/:id/status`**

Valid status values: `pending` / `confirmed` / `cancelled` / `completed`

```bash
curl -X PATCH http://localhost:5000/api/appointments/b2c3d4e5-.../status \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "confirmed" }'
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "b2c3d4e5-...",
    "name": "Emily Clarke",
    "status": "confirmed",
    ...
  }
}
```

**Error responses:**
| Status | Message | Cause |
|---|---|---|
| `400` | `Invalid status. Must be pending, confirmed, cancelled, or completed.` | Wrong status value |
| `401` | `Unauthorised.` | Wrong or missing API key |
| `404` | `Appointment not found.` | ID does not exist |

---

### Delete an appointment (admin)

**`DELETE /api/appointments/:id`**

```bash
curl -X DELETE http://localhost:5000/api/appointments/b2c3d4e5-... \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

**Response `200`:**
```json
{ "success": true }
```

**Error responses:**
| Status | Message | Cause |
|---|---|---|
| `401` | `Unauthorised.` | Wrong or missing API key |
| `404` | `Appointment not found.` | ID does not exist |

---

## 4. AI Chat

Powers the chat widget on the website. Stateless — conversation history is sent by the frontend with every request. Nothing is stored in the database.

**`POST /api/chat/message`**

**Headers:**
```
Content-Type: application/json
```

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "What treatments do you offer?" },
    { "role": "assistant", "content": "We offer a range of treatments..." }
  ],
  "message": "Tell me more about Smooth Lines"
}
```

| Field | Required | Rules |
|---|---|---|
| `message` | Yes | The new user message. Max 2000 characters. |
| `messages` | No | Previous conversation history. Send `[]` for first message. Each item must have `role` (`user` or `assistant`) and `content` (string). |

**First message:**
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{ "messages": [], "message": "What treatments do you offer?" }'
```

**Response `200`:**
```json
{
  "reply": "At Kensley Aesthetics, we offer a range of personalised non-surgical treatments..."
}
```

**Error responses:**
| Status | Message | Cause |
|---|---|---|
| `400` | `message is required.` | Missing or non-string message |
| `400` | `Message is too long. Maximum 2000 characters.` | Message over limit |
| `429` | `Too many messages. Please slow down.` | 20 messages/minute per IP |
| `502` | `AI service temporarily unavailable.` | Anthropic API error |

---

## 5. Admin (Contact submissions)

### List all contact submissions

**`GET /api/contact`**

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

**Optional query params:**
| Param | Description | Default |
|---|---|---|
| `status` | Filter: `new`, `read`, `replied` | All |
| `limit` | Max results | `50` (max `200`) |
| `offset` | Pagination offset | `0` |

```bash
curl http://localhost:5000/api/contact \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

**Response `200`:**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "name": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "07700900123",
      "service": "Smooth Lines",
      "message": "I would like to find out more.",
      "status": "new",
      "created_at": "2025-01-14T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Update contact status (admin)

**`PATCH /api/contact/:id/status`**

Valid status values: `new` / `read` / `replied`

```bash
curl -X PATCH http://localhost:5000/api/contact/a1b2c3d4-.../status \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "replied" }'
```

**Response `200`:**
```json
{
  "success": true,
  "data": { ...updated contact object... }
}
```

---

## End-to-End Verification Checklist

### Server
- [ ] `GET /health` → `{ "status": "ok" }`

### Contact form
- [ ] `POST /api/contact` with all fields → `201` with an `id`
- [ ] Open Admin Panel → submission appears with status `new`
- [ ] `PATCH /api/contact/:id/status` → status updates to `replied`

### Appointments
- [ ] `POST /api/appointments` with all fields → `201` with an `id`
- [ ] `GET /api/appointments` (with admin key) → appointment appears in list
- [ ] `GET /api/appointments/:id` → returns that single appointment
- [ ] `PATCH /api/appointments/:id/status` with `confirmed` → status updates
- [ ] `DELETE /api/appointments/:id` → returns `{ "success": true }`

### AI Chat
- [ ] `POST /api/chat/message` with `"messages": [], "message": "Hello"` → returns a `reply`
- [ ] Send second message with history → AI remembers context

### Auth
- [ ] Any admin endpoint with wrong key → `401`
- [ ] Any admin endpoint with correct key → `200`
