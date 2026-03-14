# SUVIDHA KIOSK — API Documentation

> **Base URL**: `http://localhost:5000/api`  
> **Auth Header**: `Authorization: Bearer <jwt_token>`  
> **Kiosk Header**: `X-Kiosk-Id: <kiosk_identifier>` (optional, for audit)

---

## Standard Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { }
}
```

Paginated responses add:
```json
{
  "success": true,
  "message": "...",
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

---

## 🔐 Authentication

### POST `/api/auth/register`
Register a new citizen.

**Body:**
```json
{
  "name": "Rajesh Kumar",
  "mobile": "9876543210",
  "email": "rajesh@email.com",
  "aadhaar": "123456789012",
  "password": "mypassword123",
  "address": "42 MG Road, Ward 12",
  "ward": "12",
  "zone": "North"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Rajesh Kumar",
      "mobile": "9876543210",
      "role": "citizen"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

### POST `/api/auth/login`
Login for all roles (citizen, admin, staff).

**Body:**
```json
{
  "mobile": "9876543210",
  "password": "mypassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Rajesh Kumar",
      "mobile": "9876543210",
      "role": "citizen",
      "aadhaar_masked": "XXXX XXXX 9012",
      "address": "42 MG Road",
      "ward": "12",
      "zone": "North"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

### POST `/api/auth/refresh`
Refresh an expired access token.

**Body:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

### POST `/api/auth/logout` 🔒
Invalidate refresh token.

### GET `/api/auth/profile` 🔒
Get current user profile with utility accounts.

---

## ⚡ Electricity Service

### GET `/api/electricity/bills` 🔒
Get electricity bills. Query: `?status=pending&page=1&limit=10`

### GET `/api/electricity/bills/:id` 🔒
Get single bill details.

### GET `/api/electricity/history` 🔒
Get payment history. Query: `?page=1&limit=10`

### GET `/api/electricity/account` 🔒
Get electricity account details.

### POST `/api/electricity/new-connection` 🔒
Request new electricity connection.

**Body:**
```json
{
  "description": "Need new connection for residential property",
  "ward": "12",
  "phone": "9876543210"
}
```

---

## 🔥 Gas Service

### POST `/api/gas/book` 🔒
Book LPG cylinder.

**Body:**
```json
{
  "description": "LPG Cylinder Booking",
  "ward": "12",
  "phone": "9876543210"
}
```

### GET `/api/gas/bills` 🔒
Get gas bills. Query: `?status=pending&page=1&limit=10`

### GET `/api/gas/status` 🔒
Get gas payment status history.

### GET `/api/gas/account` 🔒
Get gas account details.

---

## 🏛️ Municipal Services

### GET `/api/municipal/water/bills` 🔒
Get water supply bills.

### GET `/api/municipal/property-tax` 🔒
Get property tax bills.

### POST `/api/municipal/property-tax/pay` 🔒
Verify property tax bill for payment.

**Body:**
```json
{
  "bill_id": "uuid"
}
```

### POST `/api/municipal/address-change` 🔒
Submit address change request.

**Body:**
```json
{
  "description": "Changed address to 56 Park Street",
  "ward": "15",
  "phone": "9876543210"
}
```

### POST `/api/municipal/waste` 🔒
Submit waste management service request.

**Body:**
```json
{
  "request_type": "Waste Collection",
  "description": "Need special waste pickup for large items",
  "ward": "12",
  "phone": "9876543210"
}
```

### GET `/api/municipal/requests` 🔒
Get my municipal service requests. Query: `?department=Municipal&status=submitted`

---

## 💳 Payment Gateway

### POST `/api/payment/create-order` 🔒
Create Razorpay payment order.

**Body:**
```json
{
  "bill_id": "uuid-of-bill",
  "amount": 1500.00
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment order created",
  "data": {
    "order_id": "order_xxxxxxxxxxxxx",
    "amount": 150000,
    "currency": "INR",
    "receipt": "RCT-20260314-123456",
    "transaction_id": "uuid",
    "key_id": "rzp_test_xxx"
  }
}
```

### POST `/api/payment/verify` 🔒
Verify payment after Razorpay checkout.

**Body:**
```json
{
  "razorpay_order_id": "order_xxxxxxxxxxxxx",
  "razorpay_payment_id": "pay_xxxxxxxxxxxxx",
  "razorpay_signature": "signature_hash"
}
```

### POST `/api/payment/webhook`
Razorpay webhook endpoint (no auth — uses HMAC signature verification).

### GET `/api/payment/receipt/:id` 🔒
Get downloadable receipt metadata.

### GET `/api/payment/transactions` 🔒
Get transaction history. Query: `?status=captured&page=1&limit=10`

---

## 📢 Complaints

### POST `/api/complaints` 🔒
Register a new complaint.

**Body:**
```json
{
  "category": "Water",
  "issue_category": "PIPE_LEAK",
  "department": "Municipal",
  "subject": "Water pipe leaking in Ward 12",
  "description": "There is a major water pipe leak at the junction of MG Road and Park Street causing water wastage.",
  "ward": "12",
  "priority": "high"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Complaint registered successfully",
  "data": {
    "id": "uuid",
    "ticket_number": "CMP-20260314-567823",
    "status": "submitted",
    "stages": [
      { "stage": "submitted", "status": "current" },
      { "stage": "acknowledged", "status": "pending" },
      { "stage": "assigned", "status": "pending" },
      { "stage": "in_progress", "status": "pending" },
      { "stage": "resolved", "status": "pending" },
      { "stage": "closed", "status": "pending" }
    ]
  }
}
```

### GET `/api/complaints` 🔒
Get my complaints. Query: `?status=submitted&department=Municipal&page=1&limit=10`

### GET `/api/complaints/track/:ticketNumber`
Track complaint by ticket number (public).

### PUT `/api/complaints/:id/status` 🔒 👤 Staff/Admin
Update complaint status and lifecycle.

**Body:**
```json
{
  "status": "in_progress",
  "notes": "Team dispatched to verify the issue",
  "assigned_to": "staff-uuid",
  "resolution_note": null
}
```

### POST `/api/complaints/:id/messages` 🔒
Add message to complaint thread.

**Body:**
```json
{
  "text": "When will this be fixed?"
}
```

---

## 📋 Service Requests

### POST `/api/service-requests` 🔒
Create a new service request.

**Body:**
```json
{
  "request_type": "New Water Connection",
  "department": "Municipal",
  "description": "Need new water connection for newly built house",
  "ward": "12",
  "phone": "9876543210",
  "metadata": { "property_type": "residential" }
}
```

### GET `/api/service-requests` 🔒
Get my service requests. Query: `?status=submitted&department=Electricity`

### GET `/api/service-requests/track/:ticketNumber`
Track by ticket number (public).

### GET `/api/service-requests/search`
Search by ticket number, phone, or name. Query: `?query=TKT-2026`

### PUT `/api/service-requests/:id/status` 🔒 👤 Staff/Admin
Update service request status.

---

## 👨‍💼 Admin Dashboard

All admin routes require `admin` role.

### GET `/api/admin/dashboard`
Overview statistics.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard statistics",
  "data": {
    "citizens": { "total": "150", "active": "142" },
    "bills": { "total": "500", "pending": "120", "paid": "350", "overdue": "30", "revenue": "245000.00" },
    "complaints": { "total": "80", "new": "15", "in_progress": "20", "resolved": "45" },
    "service_requests": { "total": "60", "new": "10", "completed": "40" },
    "transactions": { "total": "350", "total_collected": "245000.00" }
  }
}
```

### GET `/api/admin/logs`
Kiosk interaction logs. Query: `?kiosk_id=K001&module=auth&start_date=2026-03-01&end_date=2026-03-14&page=1&limit=25`

### GET `/api/admin/analytics/service-requests`
Service request analytics. Query: `?period=30`

### GET `/api/admin/analytics/payments`
Payment statistics. Query: `?period=30`

### GET `/api/admin/complaints`
All complaints. Query: `?status=submitted&department=Municipal&priority=high`

### GET `/api/admin/service-requests`
All service requests.

### GET `/api/admin/citizens`
All citizen accounts. Query: `?search=Rajesh&page=1&limit=25`

### GET `/api/admin/config`
Get dynamic service configuration.

### PUT `/api/admin/config/:serviceName`
Enable/disable a service.

**Body:**
```json
{
  "is_enabled": false,
  "description": "Temporarily disabled for maintenance"
}
```

---

## 🏥 Health Check

### GET `/api/health`
Server health status (no auth).

```json
{
  "success": true,
  "message": "SUVIDHA KIOSK Backend is running",
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-14T09:39:42.000Z",
    "version": "1.0.0",
    "uptime": 3600
  }
}
```

---

## Legend

- 🔒 = Requires JWT authentication
- 👤 = Requires specific role (Staff/Admin)
