# AAZHI — AI Project Analyzer & Documentation

AAZHI (also known as Suvidha Kiosk) is a Unified Civic Utility Self-Service Kiosk Platform designed to bridge the digital divide by allowing citizens to easily pay utility bills (electricity, water, gas, property tax) and report civic grievances (complaints and service requests) using a multilingual interface. This platform features a hybrid monolith-microservice architecture, offline AI-driven validation, real-time tracking, and a cryptographic tamper-evident audit trail.

---

## 1. Project Overview

* **Project Name**: AAZHI (Suvidha Kiosk Platform)
* **Purpose of the Application**: AAZHI is an interactive digital helpdesk and self-service kiosk system designed to allow citizens to interact with municipal corporations and utility providers. It facilitates easy bill payment, grievance lodging, and application tracking.
* **Main Features**:
  * **Multilingual UI & Voice Navigation**: Supports 11+ regional Indian languages (English, Hindi, Tamil, Bengali, Assamese, Odia, Urdu, Marathi, Kannada, Malayalam, Gujarati) with Unicode-safe voice routing, speech-to-text, and native text-to-speech.
  * **Utility Billing & Payment**: Seamless invoice queries, payment execution via Razorpay integration, transaction histories, and PDF receipt downloads.
  * **Dynamic Grievance & Request Portals**: Forms for reporting infrastructure failures, sanitation issues, gas leaks, water line breaks, and municipal license applications.
  * **Dynamic Process Workflows**: Workflow stage definitions queried dynamically from the database using a custom hook (`useWorkflow`).
  * **Cryptographic Tamper-Evident Audit Chain**: An immutable database record structure where each transaction log contains the SHA-256 HMAC of the previous row to detect backend tampering.
  * **AI Civic Intelligence Engine**: Runs a local FastAPI Python service that checks complaints for spam (LinearSVC), routes complaints to departments, evaluates duplicates (TF-IDF cosine similarity), determines sentiment/urgency, and generates prediction forecasts.
* **Problem It Solves**: In physical government offices and public spaces, citizens face long queues, manual application delays, and language barriers. AAZHI provides a fast, digital, self-contained terminal with voice assistance, automated routing, and instant feedback.
* **Target Users**: General public (citizens), municipal corporation officers, local utility managers (electricity, gas, water boards), and terminal administrators.

---

## 2. Tech Stack

The architecture is designed for low resource terminals (kiosks) communicating with a cloud backend, split into a dual-mode deployable format (standalone Express monolith vs. containerized Docker microservices).

| Tier | Technology | Rationale & Usage |
| :--- | :--- | :--- |
| **Frontend (Citizen Kiosk)** | React 19, TypeScript, Vite, TailwindCSS, i18next, Framer Motion | React 19 provides speed and hook performance. Vite handles quick bundling. TailwindCSS provides modern fluid styling. i18next serves localization. Framer Motion provides high-fidelity micro-animations for feedback. |
| **Frontend (Admin Portal)** | React 18, TypeScript, Vite, Recharts, Leaflet | Recharts generates analytics dashboards. Leaflet displays geographic coordinates of complaints and service requests. |
| **Backend Monolith** | Node.js, Express, Socket.IO, Winston, Joi | Express handles HTTP routes. Socket.IO allows real-time coordination (e.g. mobile tracking sync). Winston provides structured logs. Joi handles zero-trust schema validation. |
| **Microservices Gateway** | Express, `express-http-proxy`, Helmet | Proxies incoming requests on port 5000 to respective backend microservices on ports 5001-5005. |
| **AI / NLP Service** | FastAPI, Python 3, Scikit-learn, OpenAI API Client, Joblib | FastAPI is lightweight. Scikit-learn handles TF-IDF vectorization and custom LinearSVC classifiers locally, ensuring the kiosk runs offline. OpenAI Client provides optional summarization summaries. |
| **Database & Cache** | Supabase (PostgreSQL 15), Redis | PostgreSQL serves as the relational data store. Redis manages rate-limiting buckets and cache layers. |
| **DevOps / Containers** | Docker, Docker Compose, Capacitor | Docker containerizes backend microservices. Capacitor compiles the citizen frontend into a native Android app (`com.aazhi.kiosk`). |

---

## 3. Folder Structure Analysis

The project contains two main workspaces: the frontend apps (`Frontend/user` and `Frontend/admin`) and the backend logic (`backend` monolith and `microservices` container suites).

### Directory Tree

```
aazhi/
├── capacitor.config.json           # Capacitor mobile build configuration
├── package.json                    # Workspace dependencies (Capacitor & Express)
├── Frontend/
│   ├── admin/                      # React Admin Panel
│   │   ├── src/
│   │   │   ├── components/         # Admin UI panels (ServiceRequestsPanel, etc.)
│   │   │   ├── context/            # Admin Auth & Language contexts
│   │   │   ├── pages/              # LoginPage, DashboardPage
│   │   │   └── index.css           # Styling system
│   │   └── package.json
│   └── user/                       # Citizen Kiosk App
│       ├── src/
│       │   ├── components/         # Kiosk UI, DocScanner, VoiceFeedbackController
│       │   ├── contexts/           # ServiceComplaintContext, VoiceAssistantContext
│       │   ├── hooks/              # Custom hooks (useWorkflow, etc.)
│       │   ├── services/           # ApiClient, civicService, geminiService
│       │   └── utils/              # VoiceCommandRouter, globalVoice, speak
│       ├── package.json
│       └── tailwind.config.js
├── backend/                        # Node.js Monolith Backend
│   ├── ai-service/                 # FastAPI Python AI Microservice
│   │   ├── core/                   # Model managers & handlers
│   │   ├── models/                 # Serialized model pickles (.pkl)
│   │   ├── main.py                 # FastAPI service routes
│   │   └── requirements.txt
│   ├── config/                     # DB client pool and Supabase configurations
│   ├── controllers/                # Monolith business controllers
│   ├── middleware/                 # SecurityEngine, auditLogger, rate limiters
│   ├── models/                     # SQL schemas and migration scripts
│   ├── routes/                     # Monolith route endpoints
│   ├── utils/                      # Validation engines, Winston logging
│   └── server.js                   # Monolith main entry point
└── microservices/                  # Distributed Microservice Containers
    ├── auth-service/               # Authentication microservice (Port 5001)
    ├── gas-service/                # Gas booking microservice (Port 5002)
    ├── electricity-service/        # Electricity billing microservice (Port 5003)
    ├── municipal-service/          # Complaints, requests, tax microservice (Port 5004)
    ├── gateway/                    # API Gateway (Port 5000)
    └── docker-compose.yml          # Local container orchestration configuration
```

### Module Responsibilities & Relationships
* **Frontend/user ↔ backend**: The citizen kiosk communicates with the backend via `/api/*` endpoints. It includes a fallback mechanism: if the token is missing or a guest login is used, it utilizes `/api/complaints/debug` and `/api/service-requests/debug` endpoints which do not enforce auth.
* **backend/controllers ↔ backend/ai-service**: Node.js controllers forward description text to the Python FastAPI AI service at `${AI_SERVICE_URL}` to automatically screen spam, find duplicates, check urgency/sentiment, and route complaints to the correct department.
* **microservices ↔ backend**: The containerized microservices mirror the folder structure of the monolith backend, enabling the project to be deployed as a single Express server or a Docker Compose cluster.

---

## 4. Frontend Architecture

### Routing & View State Flow
The user app operates on a hybrid routing system. `React-Router-Dom` synchronizes URL paths (e.g. `/services`, `/pay-bills`, `/track`) to keep browser histories active. Simultaneously, a React `useState<ViewState>` machine manages full-screen overrides.

```mermaid
graph TD
    A[LANDING - Language Select] -->|Select Language| B[SELECTION - Mode Panel]
    B -->|Click AI Assistant| C[DASHBOARD - AI Tab]
    B -->|Click Pay Bills| D[DASHBOARD - Billing Tab]
    B -->|Cancel| A
    B -->|Auth Required| E[LOGIN - Aadhaar/OTP]
    E -->|Success| B
    C -->|Logout Inactivity| A
    D -->|Logout Inactivity| A
```

### State Management
* **ServiceComplaintContext**: Governs complaints, requests, and alerts state. Loads initial cache from localStorage on boot and triggers a background sync polling the backend every 30 seconds. Overwrites cached values with DB updates, keeping lists consistent.
* **VoiceAssistantContext**: Drives speech recognition (`webkitSpeechRecognition` API) and manages listening indicators, voice inputs, and audio prompts.
* **OrientationContext**: Detects and forces portrait vertical kiosk mode (forcing CSS flex adjustments) vs. landscape desktop mode.

### Multilingual & Voice Command Routing
1. **Multilingual translation (`i18n.ts`)**: Localization JSONs reside in `locales/`. Key translation files like `TRANSLATION_SYSTEM.md` map keys dynamically.
2. **Text-To-Speech (`speak.ts`)**: Loads browser accessibility voices, matching the speaking voice to the user's selected language.
3. **Voice Command Router (`VoiceCommandRouter.ts`)**: Receives speech transcripts. It mitigates traditional NLP issues:
   * **Phrase Length Sorting**: Sorts voice matching rules by length DESC so that complex phrases like `"electricity bill"` are checked before generic words like `"bill"`.
   * **Context Awareness**: Checks sub-rules matching the active tab context first (e.g. `"gas"` means LPG booking if in billing, but opens the gas service request if global).
   * **Unicode-Safe Normalization**: Removes only ASCII punctuation while preserving Hindi (`बिजली बिल`), Tamil (`மின்சாரம்`), and Assamese characters.

---

## 5. Backend Architecture

The backend monolith handles incoming requests by filtering them through security layers before reaching the routers.

```mermaid
graph TD
    A[Incoming Request] --> B[compression Gzip]
    B --> C[SecurityEngine.applySecurityHeaders]
    C --> D[CORS Origin Check]
    D --> E[SecurityEngine.gatekeeper]
    E -->|Blocked IP / Invalid WAF Secret| F[403 Forbidden]
    E -->|Leaky Bucket Exceeded| G[429 Too Many Requests]
    E -->|Pass| H[auditLogger]
    H --> I[API Routers]
    I -->|Error| J[errorHandler Middleware]
```

### Critical Middleware
* **SecurityEngine WAF (`SecurityEngine.js`)**: Applies helmet security policies, parameter pollution guards (`hpp`), and HSTS. The WAF secret validator checks the `x-waf-secret` header. The Leaky Bucket rate limiter tracks client IPs in an in-memory Map, refilling 1 token/sec up to a bucket capacity of 60.
* **Audit Logger (`audit.middleware.js`)**: Logs method, route, IP, status code, latency, and user identifiers (via JWT or Auth0 session) on `res.on('finish')` using Winston.

### Data Sync & Domain Division
In the microservices model, each container contains a subset of backend routes and interacts with a shared Supabase database. An API Gateway redirects traffic, while a Redis container acts as a cache and rate limiter.

---

## 6. Database Documentation

AAZHI utilizes a PostgreSQL database. Primary keys are UUIDs generated via `uuid-ossp`.

### Entity-Relationship Model (Relational Diagram)

```
  ┌───────────────┐          ┌─────────────────────┐
  │   CITIZENS    │◄─────────│  UTILITY_ACCOUNTS   │
  │  (User/Staff) │1        *│   (Electricity/Gas) │
  └──────┬────────┘          └──────────┬──────────┘
         │1                             │1
         │                              │
         │*                             │*
  ┌──────▼────────┐              ┌──────▼──────────┐
  │  COMPLAINTS   │◄─────────────│      BILLS      │
  │(Ward Grievance)│1           *│ (Due Invoices)  │
  └──────┬────────┘              └──────┬──────────┘
         │1                             │1
         │                              │
         │*                             │*
  ┌──────▼────────┐              ┌──────▼──────────┐
  │COMPLAINT_STAGE│              │  TRANSACTIONS   │
  │ (Audit Trail) │              │(Razorpay Orders)│
  └───────────────┘              └─────────────────┘
```

### Table Definitions

#### `citizens`
Stores authentication credentials, contact info, and roles.
* `id` (UUID, Primary Key)
* `mobile` (VARCHAR, Unique, Indexed)
* `role` (VARCHAR: `citizen`, `admin`, `staff`)
* `aadhaar_hash` / `aadhaar_masked` (VARCHAR)
* `password_hash` (VARCHAR)
* `ward` / `zone` (VARCHAR)

#### `utility_accounts`
Maps utility connections to citizen profiles.
* `id` (UUID, Primary Key)
* `citizen_id` (UUID, References `citizens.id` on delete cascade)
* `service_type` (VARCHAR: `electricity`, `gas`, `water`, `property`, `waste`)
* `account_number` (VARCHAR, Unique, Indexed)
* `meter_number` (VARCHAR)

#### `bills`
Invoices linked to utility accounts.
* `id` (UUID, Primary Key)
* `account_id` (UUID, References `utility_accounts.id`)
* `citizen_id` (UUID, References `citizens.id`)
* `amount` / `tax_amount` / `total_amount` (NUMERIC)
* `status` (VARCHAR: `pending`, `paid`, `overdue`)

#### `transactions`
Razorpay order mappings and billing payment statuses.
* `id` (UUID, Primary Key)
* `bill_id` (UUID, References `bills.id`)
* `citizen_id` (UUID, References `citizens.id`)
* `razorpay_order_id` / `razorpay_payment_id` (VARCHAR)
* `payment_status` (VARCHAR: `created`, `authorized`, `captured`, `failed`)

#### `complaints`
Citizen-submitted civic grievances.
* `id` (UUID, Primary Key)
* `ticket_number` (VARCHAR, Unique, Indexed)
* `citizen_id` (UUID, References `citizens.id`)
* `category` (VARCHAR, e.g. `Water`, `Electricity`)
* `status` (VARCHAR: `active`, `resolved`, `rejected`)
* `stage` (VARCHAR: `submitted`, `officer_assigned`, `manager_review`, `resolved`)

#### `audit_chain_entries`
Tamper-evident cryptographic ledger (defined in `audit_chain_schema.sql`).
* `id` (UUID, Primary Key)
* `chain_sequence` (BIGSERIAL, Unique)
* `actor_id` (UUID)
* `resource_id` (UUID)
* `action` (ENUM)
* `previous_entry_id` (UUID, References self)
* `previous_entry_hmac` / `entry_hmac` (TEXT)
* `previous_state_hash` / `current_state_hash` (CHAR(64))

---

## 7. API Documentation

All standard backend routes are grouped under the `/api` prefix.

### 1. Authentication

* **`POST /api/auth/send-otp`**
  * **Purpose**: Generates a 6-digit OTP and sends it via Twilio.
  * **Request Body**: `{"mobile": "9999999999"}`
  * **Response (200)**: `{"success": true, "message": "OTP sent successfully via SMS", "data": {"mobile": "9999999999", "expiresAt": "2026-06-03..."}}`
  * **Auth Required**: None

* **`POST /api/auth/verify-otp`**
  * **Purpose**: Validates OTP and registers/logs in the citizen, returning JWT tokens.
  * **Request Body**: `{"mobile": "9999999999", "otp": "123456"}`
  * **Response (200)**: Contains user record, accessToken, and refreshToken. Sets HTTP-Only cookies.

* **`POST /api/auth/mock-aadhaar`**
  * **Purpose**: Simulates Aadhaar biometric login (demo mode) and binds to the test citizen profile.
  * **Request Body**: `{"aadhaarNumber": "123456789012"}`
  * **Response (200)**: Simulates Aadhaar verification.

* **`POST /api/auth/kiosk/login`**
  * **Purpose**: Logs in a user using their utility consumer ID (attaches the token to the citizen account).
  * **Request Body**: `{"consumerId": "111111111111"}`
  * **Response (200)**: Valid auth tokens.

---

### 2. Grievances & Complaints

* **`POST /api/complaints`**
  * **Purpose**: Submits a new complaint. Runs it through the FastAPI AI service first to check for spam, duplicates, sentiment, and route to the correct department.
  * **Request Body**:
    ```json
    {
      "subject": "Water Pipe Burst",
      "category": "leak",
      "department": "Water",
      "description": "Main water pipeline broke at Ward 4, street leaking.",
      "ward": "Ward 4"
    }
    ```
  * **Response (201)**: Returns the generated ticket number (e.g. `CMP-20260603-9123`) and initial status.
  * **Auth Required**: Yes (JWT Bearer)

* **`POST /api/complaints/debug`**
  * **Purpose**: Bypasses JWT check. Used for kiosk terminals in guest mode. Accepts user information in request body.
  * **Request Body**: Includes all fields from `POST /api/complaints` plus `citizen_id` and `phone`.
  * **Response (201)**: Creates the complaint record.

* **`GET /api/complaints/track/:ticketNumber`**
  * **Purpose**: Fetches the status and historical timeline stages of a complaint.
  * **Response (200)**: Detailed complaint record with an array of workflow stages.
  * **Auth Required**: None (Optional)

---

### 3. AI Service Endpoints (FastAPI on Port 5005)

* **`POST /api/ai/analyze`**
  * **Purpose**: Complete intake pipeline validation. Checks text against LinearSVC spam classification, calculates cosine similarity against existing tickets to check for duplicates, routes to the correct department, and assesses sentiment/urgency.
  * **Request Body**:
    ```json
    {
      "text": "The streetlight is broken and sparking.",
      "existing_complaints": []
    }
    ```
  * **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "validation": { "is_spam": false, "confidence": 0.98, "reason": "...", "classification": "legitimate" },
        "department": { "department": "electricity", "confidence": 0.95 },
        "duplicate": null,
        "sentiment": { "sentiment": "Frustrated", "urgency": 4, "key_phrases": ["streetlight", "sparking"] }
      }
    }
    ```

---

## 8. Authentication & Authorization

AAZHI implements a zero-trust dual-token authentication workflow.

```mermaid
sequenceDiagram
    participant Citizen
    participant Client
    participant Server
    participant DB

    Citizen->>Client: Input Mobile Number
    Client->>Server: POST /auth/send-otp
    Server->>DB: Save OTP & expiry
    Server-->>Client: 200 OK (OTP Sent via Twilio)
    Citizen->>Client: Submit OTP
    Client->>Server: POST /auth/verify-otp
    Server->>DB: Validate OTP
    Server->>Server: Generate JWT (Access + Refresh)
    Server-->>Client: Sets Cookies + returns User payload
```

* **JWT Handling**:
  * **Access Token**: Placed in memory (sent in authorization header) and set as an HTTP-Only cookie. Expires in 1 hour.
  * **Refresh Token**: Stored in the database (`refresh_token` field in `citizens` table) and set as a secure cookie. Expires in 7 days.
* **Role-Based Access Control (RBAC)**:
  * Handled via `role.middleware.js` checking `req.user.role`.
  * `citizen`: Can view their own complaints, requests, and bills.
  * `staff`: Can update ticket assignments and change workflow stages.
  * `admin`: Can modify service configs, view audits, configure alerts, and see forecasting models.

---

## 9. Environment Variables

### Backend Monolith (`backend/.env`)

| Variable Name | Purpose | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Target environment profile | `development` / `production` | Yes |
| `PORT` | Node server listening port | `5000` | Yes |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://user:pass@host:port/db` | Yes |
| `JWT_SECRET` | Secret key for access token | Random hex string | Yes |
| `JWT_REFRESH_SECRET` | Secret key for refresh token | Random hex string | Yes |
| `REDIS_URL` | Redis URL for cache/rate-limiting | `redis://localhost:6379` | No |
| `RAZORPAY_KEY` | Razorpay API Public Key | `rzp_test_...` | Yes |
| `RAZORPAY_SECRET` | Razorpay API Secret | Client secret | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | `AC...` | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Client secret | Yes |
| `TWILIO_PHONE_NUMBER` | Twilio purchased number | `+1350...` | Yes |
| `AI_SERVICE_URL` | Route link to FastAPI service | `https://ai-service-aazhi.onrender.com` | Yes |

### Frontend User (`Frontend/user/.env`)

| Variable Name | Purpose | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base path of Node backend | `http://localhost:5000/api` | Yes |
| `VITE_AI_SERVICE_URL` | Base path of AI service | `https://ai-service-aazhi.onrender.com` | Yes |
| `VITE_GEMINI_API_KEY` | Browser Gemini direct key | `AIzaSy...` | Yes |

---

## 10. Third-Party Integrations

```mermaid
graph LR
    A[AAZHI Kiosk] -->|Trigger Payments| B[Razorpay SDK]
    A -->|Auto-detect location| C[Nominatim Map API]
    A -->|Direct Citizen Query| D[Google Gemini 2.5 Flash]
    E[Node Backend] -->|Send OTP SMS| F[Twilio API]
    G[FastAPI AI] -->|GPT Summarization| H[OpenAI API]
```

### Integration Details
1. **Razorpay**:
   * Frontend: Mounts `https://checkout.razorpay.com/v1/checkout.js`.
   * Workflow: The client calls `/payment/create-order`. The backend initializes a Razorpay order, returning the order ID. The client launches the Razorpay payment modal. Once paid, the payment payload is verified by checking the SHA-256 HMAC signature against `RAZORPAY_WEBHOOK_SECRET`.
2. **Twilio**:
   * Used for delivering 2FA OTP codes to users. The backend initializes `twilio(accountSid, authToken)` and sends SMS payloads containing verification pins.
3. **Nominatim OpenStreetMap**:
   * The frontend uses geolocation coords to query OpenStreetMap reverse-geocoding, resolving state names. This mapping updates the alert banner language selection automatically (e.g. if state is `"Kerala"`, voice/alert language switches to Malayalam).
4. **Google Gemini Developer API**:
   * Integrates `gemini-2.5-flash` directly into the client. It handles citizen queries when they are in "Queries" mode, answering municipal questions and converting answers to speech.

---

## 11. Build & Deployment

### Stands / Local Setup

#### Prerequisites
* Node.js v18+ & Python 3.10+
* PostgreSQL 15 & Redis

#### Setup Commands
```bash
# Clone the repository
git clone https://github.com/ajaiselvaraj/aazhi.git
cd aazhi/aazhi

# Install monolith dependencies
cd backend
npm install
# Startup monolith
npm run dev

# Install Python AI dependencies
cd ai-service
pip install -r requirements.txt
# Train classifier and startup
python train_model.py
python main.py

# Install and start user frontend
cd ../../Frontend/user
npm install
npm run dev
```

### Docker Setup (Microservices Mode)
The containerized services can be launched using Docker Compose.

```bash
cd microservices
docker-compose up --build
```
This launches the PostgreSQL container, loads `schema.sql`, boots the API Gateway on port 5000, starts Redis, and launches the domain microservices on their respective ports.

---

## 12. Code Quality Analysis

* **Code Consistency**: The JavaScript files conform to modern ES Modules style (`import`/`export`). The frontend utilizes typed TypeScript interfaces, ensuring clean component contract definitions.
* **Architecture Quality**:
  * **Dual Architecture**: Maintaining both an Express monolith and Docker microservices provides flexibility but introduces duplication, as the microservices copy controller code from the backend monolith.
  * **Voice Command Routing**: The phrase-length matching logic prevents greedy sub-phrase conflicts, providing clean navigation.
* **Scalability**: By containerizing the services under Docker Compose, the system can scale database queries, AI processing, and utility requests independently.
* **Maintainability**:
  * **Local Storage Syncing**: The local state sync logic handles background updates cleanly, but makes the React contexts complex.
  * **Dormant Audit Chain**: The cryptographic `audit_chain_entries` schema is defined in SQL but not utilized in the Node.js application, which constitutes technical debt.

---

## 13. Bugs & Risk Areas

> [!WARNING]
> ### 1. API Gateway Routing Mismatch (Microservices Broken)
> In `microservices/gateway/app.js`, the proxy routes only include `/auth`, `/users`, `/gas`, `/electricity`, `/municipal`, and `/ai`. However, `municipal-service/app.js` exposes `/complaints` and `/service-requests` routes. Because these paths are not proxied by the gateway, requests to `/complaints` or `/service-requests` fail with a 404 error from the Gateway.

> [!IMPORTANT]
> ### 2. WAF Geo-Fencing Bypass
> The `SecurityEngine.js` middleware initializes `ALLOWED_COUNTRIES` based on env configurations (`ALLOWED_COUNTRIES=IN`). However, the `gatekeeper` method does not enforce this list or check client locations. This allows requests from blocked countries to bypass the geofence.

> [!CAUTION]
> ### 3. Hardcoded Frontend Gemini API Key
> The direct Gemini integration in `geminiService.ts` queries the API directly from the user's browser. This exposes the API key (`VITE_GEMINI_API_KEY`) in client bundles, allowing users to extract it.

> [!NOTE]
> ### 4. Dormant Cryptographic Audit Ledger
> The tamper-evident `audit_chain_entries` schema is defined in SQL, including the `append_audit_chain_entry` function. However, the backend application code only logs to standard output via Winston (`logger.info("AUDIT", ...)`), meaning database mutations are not recorded in the cryptographic ledger.

---

## 14. Improvement Suggestions

### 1. Refactor API Gateway Proxy Mapping
Update `microservices/gateway/app.js` to proxy complaints and service requests to the municipal service:
```javascript
app.use('/complaints', proxy(MUNI_SERVICE, { proxyPriority: 10 }));
app.use('/service-requests', proxy(MUNI_SERVICE, { proxyPriority: 10 }));
```

### 2. Implement backend WAF Geo-Fencing
Utilize geolocation lookup (e.g. `geoip-lite`) in `SecurityEngine.gatekeeper` to enforce the allowed countries policy:
```javascript
const geo = geoip.lookup(ip);
if (geo && !ALLOWED_COUNTRIES.has(geo.country)) {
    return res.status(403).json({ success: false, message: "Country blocked." });
}
```

### 3. Proxy Gemini API requests through the Backend
To protect the Gemini API key, remove `VITE_GEMINI_API_KEY` from the frontend. Implement a backend proxy endpoint `/api/ai/query` to route requests to Gemini:
```javascript
router.post("/query", authMiddleware, async (req, res) => {
    // Send request to Gemini API securely using backend environment variables
});
```

### 4. Integrate Cryptographic Audit Logs in Application Controllers
Call `append_audit_chain_entry` in the database transaction pool when complaints or service requests are modified to record changes in the ledger:
```javascript
await pool.query(
  "SELECT append_audit_chain_entry($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
  [secret, actorId, actorRole, resourceType, resourceId, action, ip, userAgent, requestId, prevHash, curHash, payload]
);
```

---

## 15. AI Developer Handoff Section

This guide is designed for developers or AI agents extending this platform.

### System Overview
The citizen kiosk functions as a single-page app displaying different views based on a view state machine. It communicates with the Node.js backend. If a guest login is used (which skips SMS authentication), it routes complaints and service requests to `/api/complaints/debug` and `/api/service-requests/debug`, bypassing JWT requirements.

### Key Dependencies & Models
* **AI Service Model pickles**: Pickle files reside in `backend/ai-service/models/`.
  * `custom_spam_classifier.pkl` (LinearSVC classifier checking for spam)
  * `department_router.pkl` (classifies complaint text into categories like water, electricity, roads)
  * **Model Integrity**: The AI service validates model integrity on startup by comparing the SHA-256 hash of the pickle files against the hashes stored in `model_metadata.json`. If a model fails verification, the service falls back to rule-based classification.

### Safety Guidelines
* **Do not edit `VCR` Normalizer incorrectly**: The text normalizer in `VoiceCommandRouter.ts` must not use `/[^\w\s]/g`, as this removes non-ASCII regional characters and breaks Hindi and Tamil voice inputs.
* **Keep Debug and Auth routes in sync**: If changes are made to `/api/complaints` in `complaint.controller.js`, ensure the corresponding changes are mirrored in `createComplaintDebug` to keep guest mode functional.

---

## 16. Dependency Mapping

```
                         ┌───────────────────────┐
                         │   Frontend User UI    │
                         └───────────┬───────────┘
                                     │ (Axios calls)
                                     ▼
┌──────────────┐         ┌───────────────────────┐
│  AI Service  │◄────────┤ Node Monolith Backend ├────────┐
│ (Python Port)│ (HTTP)  └───────────┬───────────┘        │
└──────────────┘                     │ (pool client)      │ (optional client)
                                     ▼                    ▼
                         ┌───────────────────────┐   ┌──────────────┐
                         │    PostgreSQL DB      │   │   Supabase   │
                         └───────────────────────┘   └──────────────┘
```

---

## 17. Execution Flow

### App Startup Flow
1. **Node Server**: Initiates `server.js` ➔ Tests database connection (5 retries with exponential back-off) ➔ Executes database setup ➔ Schedules cron job (cleans expired OTPs every 15 minutes) ➔ Boots Socket.IO ➔ Starts HTTP server.
2. **Kiosk UI**: Boots ➔ Reads last cached route from `Persistence` ➔ Automatically requests geocoding data to detect client state ➔ Switches voice controls to the corresponding regional language.

### Request Lifecycle
```
[Client Request]
       │
       ▼
[SecurityEngine CSP & WAF] ──(exceeded limit)──➔ [429 Too Many Requests]
       │
[auditLogger Middleware]
       │
[Auth / JWT validation]
       │
[Controller Handlers] ──➔ [Query FastAPI AI] ➔ [Classifier Prediction]
       │
[Database Query Execution]
       │
[Client Response JSON]
```

---

## 18. Important Components & Files

| File Link | Purpose & Importance |
| :--- | :--- |
| [App.tsx](file:///c:/project/AAZHI/aazhi/Frontend/user/App.tsx) | Citizen UI entry point. Runs the full-screen view state machine, detects geocoding locales, and handles the inactivity timeout loop. |
| [VoiceCommandRouter.ts](file:///c:/project/AAZHI/aazhi/Frontend/user/utils/VoiceCommandRouter.ts) | Multilingual voice router. Sorts keywords by length, applies context filters, and routes inputs to UI navigation commands or the AI assistant. |
| [ServiceComplaintContext.tsx](file:///c:/project/AAZHI/aazhi/Frontend/user/contexts/ServiceComplaintContext.tsx) | Local state manager. Synchronizes local storage items with backend updates via background polling. |
| [main.py](file:///c:/project/AAZHI/aazhi/backend/ai-service/main.py) | Python FastAPI AI service. Screen spam, categorizes departments, checks duplicates via TF-IDF cosine similarity, and runs ARIMA-Lite forecasts. |
| [SecurityEngine.js](file:///c:/project/AAZHI/aazhi/backend/middleware/SecurityEngine.js) | WAF filter. Enforces security headers, checks IP blocklists, and runs the leaky bucket rate limiter. |
| [db.js](file:///c:/project/AAZHI/aazhi/backend/config/db.js) | PostgreSQL client pool configuration. Parses timestamps, logs slow queries (>500ms), and implements connection retry logic. |
| [schema.sql](file:///c:/project/AAZHI/aazhi/backend/models/schema.sql) | Relational SQL schema defining tables, indexes, and constraint check parameters. |
| [audit_chain_schema.sql](file:///c:/project/AAZHI/aazhi/backend/models/audit_chain_schema.sql) | SQL definitions for pgcrypto SHA-256 HMAC cryptographic chain ledger. |

---

## 19. Missing or Incomplete Features

* **WAF Geofencing Implementation**: `ALLOWED_COUNTRIES` array is initialized in `SecurityEngine.js` but is not checked in the `gatekeeper` middleware.
* **Tamper-Evident Ledger Integration**: The SQL schema and HMAC generation functions exist in the database, but are not invoked by backend application controllers.
* **Razorpay Webhooks Integration**: Webhook validation routes are defined, but the webhook handler logic contains placeholder blocks and does not update transaction statuses.
* **OTP cleanup in microservices**: Monolith `server.js` schedules a cron job to clean up expired OTPs every 15 minutes. This cleanup routine is missing in `auth-service/app.js`.

---

## 20. Final Summary

* **Overall Architecture Summary**: AAZHI has a hybrid architecture. The citizen frontend is built with React 19 and runs on a local geocoded state machine. The Node.js monolith routes requests, while the Python FastAPI service handles local ML processing. The microservices version enables distributed containerized deployment via Docker Compose.
* **Project Maturity Level**: **Staging-Ready**. The UI flow, billing integrations, local ML pipeline, and database queries are fully operational. Resolving the Gateway routing configuration and integrating the cryptographic audit trail would prepare the system for production.
* **Strengths**:
  * Unified multilingual voice navigation supporting regional Indian languages.
  * Local AI validation (spam filtering, auto-routing, duplicate checking) that runs offline.
  * Robust database configuration with connection retry logic and query time monitoring.
* **Weaknesses**:
  * Gateway mapping mismatch breaks complaints and request routes in containerized deployments.
  * Incomplete security implementations (inactive geofencing check, hardcoded client-side API keys).
  * Cryptographic audit chain is defined in the database but not integrated with application code.
* **Recommended Next Steps**:
  1. Update `gateway/app.js` to proxy `/complaints` and `/service-requests` to `MUNI_SERVICE`.
  2. Implement country verification in `SecurityEngine.gatekeeper`.
  3. Move client-side Gemini requests to a backend proxy route to protect the API key.
  4. Call the pgcrypto function `append_audit_chain_entry` in controllers to record database updates in the cryptographic ledger.
