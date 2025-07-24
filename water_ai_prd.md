# HydrateAI – Product Requirements Document (PRD)

## Overview

Hydrate AI is a viral, health-focused app that uses conversational AI and a minimal interface to help users stay hydrated—without manual water logging. Inspired by the simplicity and intelligence of Cal AI, Hydrate AI delivers proactive hydration nudges and intuitive tracking.

---

## Target User

Health-conscious individuals who:

- Want to improve hydration habits
- Don’t enjoy manually logging cups/ounces
- Prefer lightweight, AI-driven wellness tools

---

## Core Problem

Traditional water tracking apps require:

- Manual data input (cups/oz)
- Frequent logging effort
- Too much accuracy and friction

Users want:

- Simpler hydration reminders
- Personalized water plans
- A non-judgmental companion, not a chore

---

## Core Features

### 1. **AI-Powered Onboarding**

Upon launch, the app asks the user (one question per screen):

- Name & preferred pronouns
- Age, weight, height
- Activity level
- Typical climate (e.g. hot, temperate, cold)
- Do you often forget to drink water? (Y/N)
- Do you want daily hydration coaching? (Y/N)

Then it generates a personalized daily hydration plan (e.g. 80oz/day), split by timeframe (morning, midday, evening).

---

### 2. **Hydration Tracking Without Logging**

No manual oz-based logging.
Instead, the app offers:

#### a. Vibe Slider

"How hydrated do you feel right now?"
Slider from 🐫 ("Dry") → 💧 ("Hydrated")

#### b. AI Check-ins

Push or in-app message:
"Hey James, did you drink any water since I last checked in?"
Options: `Yes`, `No`, `A little`

#### c. Freeform Input

User types/speaks: “Had tea and a glass of water” → AI estimates amount

#### d. Optional: Apple Health Sync

Integrates with other tracking sources if enabled

#### e. Visual Reinforcement

Animated bottle that fills based on estimated intake and AI signals—because seeing a filling bottle encourages behavior.

---

### 3. **AI Nudges + Adaptation**

- Learns when you’re most likely to forget
- Sends nudges at optimal times
- Adjusts your hydration target based on patterns

---

## Virality Features

- Daily streak counter with shareable badges
- Public leaderboard of hydrated friends (opt-in)
- Post-streak celebration ("Day 7 – Hydration Hero!")

---

## Tech Stack (Suggested)

- Frontend: React Native (Expo)
- Backend:  Supabase
- AI: Grok 3 Mini function calls
- HealthKit/Google Fit integration (optional)
- Font: Google Fonts (Nunito Sans)
- Superwall for paywall

---

## Future Features

- Pee color analysis (optional, for advanced users)
- Smart bottle integrations (HydraPak, HidrateSpark)
- Weekly hydration reports

---

## Business Model

  - Premium ($4.99/mo): smart reminders, streak analytics, HealthKit sync, and visual bottle tracking

---

## Why It’ll Work

- Solves a **real**, **daily**, **health-related** problem
- Removes logging friction with a fresh AI twist
- Emotional + social + visual rewards = habit stickiness

