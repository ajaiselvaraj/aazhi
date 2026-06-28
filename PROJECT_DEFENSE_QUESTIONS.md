# SUVIDHA (AAZHI) - 100 Judge Attack Questions (Section 13)

> [!CAUTION]
> This document contains rigorous, hostile questions that evaluation committees, hackathon judges, and technical auditors will use to break the project. Study the "Strong Winning Answers" to dominate the Q&A session.

## TECHNICAL ARCHITECTURE (1-15)

**Q1: Why did you separate Node.js and Python FastAPI instead of doing everything in one?**
* **Weak:** Because Python is better for AI.
* **Ideal:** Node.js handles our I/O heavy API requests and frontend serving, while FastAPI is dedicated solely to CPU-heavy ML tasks. 
* **Strong:** We adopted a microservices pattern based on bounded contexts. Node.js is optimized for asynchronous, non-blocking I/O (handling thousands of citizen web requests), while Python is the industry standard for tensor operations and NLP. By separating them, we can scale the FastAPI ML pods independently on GPU instances, while running Node on cheap CPU instances, optimizing both performance and cloud costs.

**Q2: What happens if your Supabase instance goes down?**
* **Weak:** The app stops working until it comes back up.
* **Ideal:** We rely on Supabase's high availability, but if it fails, our API will return 503 errors gracefully.
* **Strong:** Our architecture abstracts the database layer. While we use Supabase for rapid development and real-time features, the core is standard PostgreSQL. If Supabase goes down, we have continuous WAL (Write-Ahead Logging) backups to AWS S3. We can spin up an RDS Postgres instance and redirect our connection strings with minimal RTO (Recovery Time Objective). Furthermore, our frontend Service Workers cache the UI so citizens see a friendly "maintenance" page rather than a broken app.

**Q3: How do you handle database migrations without downtime?**
* **Weak:** We run the migration script when traffic is low at night.
* **Ideal:** We use tools like Prisma or Supabase migrations to apply changes incrementally.
* **Strong:** We use a blue-green deployment strategy combined with expand-and-contract database migrations. First, we add new columns without removing old ones. We deploy the new code to write to both. Then we backfill data. Finally, we deprecate the old columns. This ensures absolutely zero downtime, which is critical for a 24/7 civic service platform.

**Q4: Your frontend is React 19. Why not SSR (Server-Side Rendering) like Next.js for SEO?**
* **Strong:** SUVIDHA is an authenticated, transactional portal, not a content blog. SEO is irrelevant for a logged-in citizen filing a personal tax complaint. React/Vite gives us lightning-fast client-side routing, offline PWA capabilities via Service Workers, and cheaper CDN hosting, which perfectly fits our requirement for the Kiosks and mobile web apps.

*(Questions 5-15 follow similar technical depth regarding State Management, Docker Networking, API Gateway vs Direct Access, Handling File Uploads asynchronously, Memory Leaks in Node, etc.)*

## SECURITY (16-30)

**Q16: How do you prevent a malicious citizen from uploading a virus disguised as a PDF document?**
* **Weak:** We only allow `.pdf` extensions on the frontend.
* **Ideal:** The backend checks the file extension and MIME type before saving it to S3.
* **Strong:** We implement defense-in-depth. Frontend validation is bypassed easily. Our Node backend uses `multer` to verify the actual file signature (magic bytes), not just the MIME type. Furthermore, uploads go to an isolated, quarantined S3 bucket that triggers an AWS Lambda function running ClamAV. Only if the scan passes is the file moved to the production bucket and linked in the database.

**Q17: How are you securing JWTs? If someone steals the token via XSS, they have full access.**
* **Weak:** We store JWTs in local storage and use React to prevent XSS.
* **Ideal:** We use short-lived tokens to minimize the window of attack.
* **Strong:** We completely mitigate XSS-based token theft by NOT storing JWTs in localStorage. We use HTTP-Only, Secure, SameSite=Strict cookies. JavaScript cannot access the token, neutralizing XSS data exfiltration. We also implement CSRF tokens for state-changing operations and maintain a Redis blacklist for revoked tokens upon logout.

**Q18: What prevents me from writing a script to submit 10,000 fake complaints and crashing your database?**
* **Strong:** We implement layered rate limiting. At the edge, Nginx limits IPs to 100 req/min. At the application layer, Express uses `express-rate-limit`. More importantly, complaint submission requires an authenticated session tied to a verified phone number (OTP) or Aadhaar ID. If an account spikes in activity, our anomaly detection flags the user, auto-bans the account, and triggers a CAPTCHA for future logins.

*(Questions 19-30 cover SQL Injection in search, RBAC bypass, Server-Side Request Forgery, Kiosk physical USB security, API key rotation, etc.)*

## SCALABILITY & PERFORMANCE (31-45)

**Q31: The AI model takes 2 seconds to process text. Under load, won't this block all your APIs?**
* **Weak:** Yes, it might be slow if many people use it.
* **Ideal:** We put the FastAPI service on a separate server so it doesn't block Express.
* **Strong:** We utilize an asynchronous message queue architecture. When a citizen submits a complaint, Express immediately saves it as "Pending AI Processing" and returns a 200 OK to the user within 50ms. Express then publishes a message to a RabbitMQ/Redis queue. FastAPI consumer workers pull from the queue, process the text, and update the database asynchronously. We can scale the Python workers infinitely based on queue depth without impacting the API response time.

**Q32: How will your relational database handle 10 million citizens?**
* **Strong:** PostgreSQL scales vertically quite well, but we've designed for horizontal scale. We use read replicas for the Admin Portal's heavy analytics dashboards, keeping the primary database free for Citizen write operations. We heavily index our most queried columns (Ticket Status, User ID). For unstructured data like the AI logs, we can easily offload to a NoSQL store or data warehouse later.

*(Questions 33-45 cover Caching invalidation, WebSocket scaling, K8s auto-scaling metrics, CDN implementation, etc.)*

## ARTIFICIAL INTELLIGENCE (46-60)

**Q46: How does your NLP handle complaints written in "Hinglish" or slang?**
* **Weak:** We use Google Translate first.
* **Ideal:** Our model is trained on multiple languages.
* **Strong:** Standard NLP models fail on code-mixed languages like Hinglish or Tanglish. We mitigate this by using specialized multilingual models (like Bhashini APIs or fine-tuned IndicBERT). Before routing to the main intent classifier, a preprocessing layer normalizes the text, transliterates it, and maps regional civic slang (e.g., "kachra", "khadda") to standard English taxonomies. 

**Q47: What happens when the AI is wrong and routes a water leak to the police department?**
* **Strong:** AI is a probabilistic tool, not an absolute. We output a confidence threshold. If confidence is >85%, it auto-routes. If <85%, it goes to a centralized "Human Triage" queue. Furthermore, every department admin has a "Wrong Department" button that kicks the ticket back into the triage queue. The system records this correction and uses it to continuously retrain and fine-tune the routing model via active learning.

*(Questions 48-60 cover Hallucinations, Model bias, Cost of LLM tokens, Offline AI on Kiosks, OCR accuracy on blurry photos, etc.)*

## BUSINESS & DEPLOYMENT (61-75)

**Q61: Governments hate SaaS subscriptions. How will you actually sell this?**
* **Strong:** While SaaS is our core, we wrap it in a CAPEX-friendly model. We sell the "Smart Kiosk Network" as a capital expenditure (which governments have budgets for, like Smart City funds). The software license and maintenance are bundled as an AMC (Annual Maintenance Contract) for 5 years. This aligns perfectly with how government tenders are structured, bypassing the hesitation around pure cloud subscriptions.

**Q62: Who pays for the internet and electricity for the kiosks?**
* **Strong:** Kiosks are strategically deployed in existing government properties (post offices, ration shops, railway stations) where electricity is already provisioned. For connectivity, we use dual-SIM industrial IoT routers with low-bandwidth telemetry, costing less than $5/month per kiosk, factored into the AMC.

*(Questions 63-75 cover White-labeling, Competitor analysis vs existing portals, Pilot project strategy, Hardware manufacturing partners, etc.)*

## ACCESSIBILITY & IMPACT (76-90)

**Q76: How does a visually impaired person use the physical kiosk?**
* **Strong:** The kiosk features a physical tactile keypad alongside the touchscreen, complete with Braille markers. It includes a standard 3.5mm headphone jack. When headphones are plugged in, the system auto-switches to an audio-only navigational interface (similar to ATMs), guiding the user through high-contrast, large-touch targets or pure voice commands.

**Q77: What about citizens with no smartphones and no kiosks nearby?**
* **Strong:** SUVIDHA embraces a true multi-channel approach. Alongside Web, App, and Kiosks, we integrate with SMS and WhatsApp chatbots. A citizen can simply send an SMS like "COMPLAINT WATER LEAK [PINCODE]" to a toll-free number, and the AI backend parses the SMS and generates a ticket, replying with the status.

*(Questions 78-90 cover Multi-lingual support offline, ADA compliance of UI, Digital literacy training, UI/UX for elderly citizens, etc.)*

## RAPID FIRE / HOSTILE (91-100)

**Q91: Why shouldn't the government just hire TCS or Infosys to build this?**
* **Strong:** Large SIs build custom, rigid systems that take 3 years and $50M to deploy. SUVIDHA is a ready-to-deploy, modular SaaS. We can pilot in a city within 2 weeks. We are selling agility, modern AI architecture, and constant updates, whereas bespoke SI projects become legacy software the day they launch.

**Q92: Your project relies on Aadhaar/Gov ID. What about data privacy?**
* **Strong:** We employ data minimization. We do not store biometric data or full ID images permanently. OCR extracts the necessary fields (Name, Address) for verification, and the image is purged. Identifying data is encrypted at rest using AES-256, and we are fully compliant with the DPDP (Digital Personal Data Protection) Act.

**Q93: Hackathon code is usually spaghetti. Is this production-ready?**
* **Strong:** We treated this hackathon as a sprint 0 for a startup. We have ESLint, Prettier, strict TypeScript/PropType definitions, CI/CD pipelines via GitHub actions, and Dockerized environments. It is architected for production from day one.

**Q94: What is your biggest technical weakness right now?**
* **Strong:** Currently, our database is a single node. While sufficient for a pilot, for state-wide deployment, we need to implement database sharding and read replicas to handle the massive read volume of public dashboards. That is our immediate next milestone.

**Q95: How do you prevent Kiosks from being used to browse inappropriate content?**
* **Strong:** The Kiosks run a locked-down, Custom Linux Kiosk OS. The UI is a secure Chromium wrapper that is heavily sandboxed. There is no URL bar, keyboard shortcuts are disabled, and it runs on a private APN network that whitelist-only connects to our API servers. It physically cannot browse the open internet.

**Q96: Show me the math on your ROI for the government.**
* **Strong:** A city of 1 million processes ~5,000 requests/day. At an average call center/admin handling time of 10 mins, that's 800 man-hours a day. At $10/hr, it costs $8,000/day ($2.9M/year). SUVIDHA automates 60% of this via AI routing and self-service, saving ~$1.7M annually. Our software costs $200k/year. The ROI is 8.5x in the first year alone.

**Q97: Are you actually going to build this, or just take the prize money?**
* **Strong:** We have already mapped out the next 6 months. Prize money goes directly into finalizing the Kiosk hardware prototype and funding cloud credits for a pilot deployment in our local municipal ward. We are treating this as seed funding.

**Q98: What if a citizen speaks a dialect your AI doesn't know?**
* **Strong:** The system gracefully degrades. If voice NLP fails, it routes the raw audio file to the department admin dashboard. The human admin can listen to the audio and manually transcribe/route it. The system never drops a complaint.

**Q99: How do you handle fake news or mass panic reporting (e.g., 500 people reporting the same fire)?**
* **Strong:** Our AI backend performs semantic deduplication. If 500 reports come from the same geofence regarding "fire" within 10 minutes, the system clusters them into a single "Master Ticket" with 500 observers. This prevents the department dashboard from being spammed, while still notifying all 500 citizens when the fire is resolved.

**Q100: Sum up your project in one sentence that will make me invest.**
* **Strong:** SUVIDHA is the AWS for civic services—a scalable, AI-driven infrastructure that finally brings 21st-century efficiency to government administration while ensuring no citizen is left offline.
