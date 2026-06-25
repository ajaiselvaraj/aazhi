# QA Test Cases: Voice Navigation & Semantic Routing Engine

The following test cases validate the emergency stabilization fixes applied to the SUVIDHA Voice Assistant, ensuring no regressions in latency, microphone lifecycle, or semantic routing.

---

### Test Case 1: Ultra-Low Latency Routing (<50ms)
**Objective:** Verify that voice commands bypass the AI backend and route instantly upon intent detection.
**Pre-conditions:** The microphone is active.
**Steps:**
1. Speak the exact phrase: "Pay Bills".
2. Observe the screen reaction time.
**Expected Result:** The application instantly (`<50ms`) routes to the Billing tab upon the first interim speech match. The screen does not freeze, and the voice overlay does not get stuck on "processing...".

---

### Test Case 2: Intent Matcher Typo-Tolerance
**Objective:** Verify that common speech-to-text anomalies do not break navigation.
**Pre-conditions:** The microphone is active.
**Steps:**
1. Open the browser console to monitor exact transcripts.
2. Force the browser to hear "payables" or "complainte" (by speaking quickly or with an accent).
**Expected Result:** "Payables" instantly triggers the `OPEN_BILLING` route. "Complainte" instantly triggers the `OPEN_COMPLAINTS` route. Navigation occurs successfully despite the transcription errors.

---

### Test Case 3: Continuous Listening (No Double Execution)
**Objective:** Verify that continuous listening does not spam the React rendering cycle.
**Pre-conditions:** Start from the Home tab with the microphone active.
**Steps:**
1. Speak a long, trailing sentence: "I want to go to the complaints page right now please".
**Expected Result:** The instant the engine detects the word "complaints", it triggers the route and sets an `isExecutingIntent` lock. The rest of the sentence ("...right now please") is gracefully ignored. The UI renders the Complaints tab exactly once without flickering or infinite loops.

---

### Test Case 4: Identical Consecutive Query Bypass
**Objective:** Verify that React state updates successfully trigger identical consecutive AI searches.
**Pre-conditions:** Navigate to the AI Assistant tab.
**Steps:**
1. Speak: "How do I pay taxes?"
2. Wait for the AI to respond.
3. Speak the exact same phrase again: "How do I pay taxes?"
**Expected Result:** A dynamic timestamp payload forces a React state update. The system processes the second query normally and generates a new AI response instead of silently ignoring it.

---

### Test Case 5: Dynamic Language Dictionary Switching
**Objective:** Verify the native `SpeechRecognition` dialect engine reboots instantly when language is switched.
**Pre-conditions:** The microphone is active and listening in English.
**Steps:**
1. In the application UI, switch the global language to Tamil (தமிழ்).
2. Speak the Tamil keyword: "புகார்" (Complaint).
**Expected Result:** The voice engine forcefully clears its English buffer, restarts instantly with the `ta-IN` dialect, correctly captures the Tamil transcript, and navigates to the Complaints tab.

---

### Test Case 6: Graceful Hardware Error Suppression
**Objective:** Verify the user is not disrupted if the hardware throws an initialization error.
**Pre-conditions:** The microphone is already actively listening.
**Steps:**
1. Manually click the "Voice Assistant" start button while it is already running.
**Expected Result:** The browser silently catches the `Failed to execute 'start' on 'SpeechRecognition': recognition has already started` error. No red error overlays are shown to the user, and the microphone continues listening uninterrupted.
