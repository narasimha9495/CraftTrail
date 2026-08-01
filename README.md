# CraftTrail

**Craft you didn't know to look for.**

A location-aware web platform that helps travellers discover, trust, and visit India's
craft artisans. A tourist standing in Jaipur may be thirty kilometres from a village that
has block-printed cloth for three hundred years — and never know it, because a search
engine only finds what you can already name. CraftTrail surfaces the verified craft
clusters around you, shows *why* each artisan is trustworthy, and lets you book a visit.

---

## What it does

- **Proximity discovery** — find craft clusters within a chosen radius of any city, on a live map.
- **Three-tier trust model** — every artisan carries a transparent trust score with visible
  ceilings: a document alone caps at 40, an institutional endorsement at 60, and only real
  visitor reviews can reach 100. The reasoning is shown, not a green tick.
- **My Journey** — a personal dashboard: saved and visited artisans on a map, trip stats
  (states, artisans, rupees supporting craftspeople), and a collectible craft passport of stamps.
- **Keepsake certificate** — a signed, shareable certificate of authenticity for every completed visit.
- **Cultural context cards** — practical "before you visit" guidance for first-time visitors.
- **Plan a trip** — pick craft villages and get a road-routed itinerary across India.
- **Live currency conversion** — prices shown in the visitor's home currency.

> **Note:** The current dataset is illustrative and payments are simulated. The platform is
> designed to ingest real GI / Pehchan / Udyam records and integrate a payment gateway as
> next steps.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, React Router, Leaflet (maps), plain CSS with design tokens |
| Backend | Node.js + Express, JWT auth |
| Database | MongoDB (Mongoose) |
| RAG service | Python + Flask, ChromaDB, Groq (Llama 3) — optional |
| Deployment | Vercel (client), Render (API), MongoDB Atlas (database) |

---

## Project structure

```
crafttrail/
├── client/     # React + Vite frontend
├── server/     # Node/Express API
└── rag/        # Python RAG chatbot service (optional)
```

---

## Getting started

**Prerequisites:** Node.js 18+, MongoDB (local or Atlas), and Python 3.10+ (only for the RAG service).

### 1. Backend (API)

```bash
cd crafttrail/server
npm install
# create a .env file (see below)
npm run seed      # populate the database with sample craft data
npm run dev       # starts the API on http://localhost:5000
```

**`server/.env`:**
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CERT_SECRET=your_certificate_secret
CLIENT_URL=http://localhost:5173
```

### 2. Frontend (client)

```bash
cd crafttrail/client
npm install
npm run dev       # starts the app on http://localhost:5173
```

**`client/.env`:**
```
VITE_API_URL=http://localhost:5000/api
```

### 3. RAG chatbot service (optional)

```bash
cd crafttrail/rag
pip install -r requirements.txt
python ingest.py    # build the vector index
python app.py       # starts the service on http://localhost:5050
```

---

## Build for production

```bash
# client
cd crafttrail/client
npm run build       # outputs to dist/
```

---

## Author

Built as a final-year major project.

*CraftTrail — connecting travellers with India's artisans, honestly and directly.*