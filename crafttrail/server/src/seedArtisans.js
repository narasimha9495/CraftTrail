// seedArtisans.js
// Loads the cleaned artisan dataset, attaches real coordinates, varies trust
// tiers, sets rating-based workshop prices, and inserts into MongoDB.
//
// USAGE (from the server folder):
//   node src/seedArtisans.js
//
// Requires: MONGO_URI in your .env

import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Artisan from './models/Artisan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Coordinates for every place in the dataset ([lng, lat]) ───────────────
const PLACE_COORDS = {
  'Srinagar, Jammu & Kashmir': [74.7973, 34.0837],
  'Budgam, Jammu & Kashmir': [74.7167, 33.9333],
  'Anantnag, Jammu & Kashmir': [75.1487, 33.7311],
  'Ganderbal, Jammu & Kashmir': [74.7757, 34.2268],
  'Kullu, Himachal Pradesh': [77.1092, 31.9578],
  'Kinnaur, Himachal Pradesh': [78.4747, 31.6069],
  'Chamba, Himachal Pradesh': [76.1264, 32.5534],
  'Kangra, Himachal Pradesh': [76.2673, 32.0998],
  'Patiala, Punjab': [76.3869, 30.3398],
  'Muktsar, Punjab': [74.5161, 30.4762],
  'Anandpur Sahib, Punjab': [76.5024, 31.2394],
  'Hoshiarpur, Punjab': [75.9115, 31.5322],
  'Panipat, Haryana': [76.9635, 29.3909],
  'Rewari, Haryana': [76.6167, 28.1833],
  'Jhajjar, Haryana': [76.6565, 28.6063],
  'Old Delhi, Delhi': [77.2300, 28.6560],
  'Mehrauli, Delhi': [77.1855, 28.5245],
  'Daryaganj, Delhi': [77.2410, 28.6440],
  'Lucknow, Uttar Pradesh': [80.9462, 26.8467],
  'Bareilly, Uttar Pradesh': [79.4304, 28.3670],
  'Bhadohi, Uttar Pradesh': [82.5697, 25.3958],
  'Firozabad, Uttar Pradesh': [78.3957, 27.1591],
  'Moradabad, Uttar Pradesh': [78.7733, 28.8386],
  'Almora, Uttarakhand': [79.6591, 29.5892],
  'Chamoli, Uttarakhand': [79.3200, 30.4000],
  'Jodhpur, Rajasthan': [73.0243, 26.2389],
  'Sanganer, Rajasthan': [75.7900, 26.8180],
  'Jaipur, Rajasthan': [75.7873, 26.9124],
  'Pratapgarh, Rajasthan': [74.7822, 24.0324],
  'Makrana, Rajasthan': [74.7263, 27.0442],
  'Jamnagar, Gujarat': [70.0577, 22.4707],
  'Patan, Gujarat': [72.1302, 23.8493],
  'Bhuj, Gujarat': [69.6669, 23.2419],
  'Nirona, Gujarat': [69.7167, 23.5333],
  'Aurangabad, Maharashtra': [75.3433, 19.8762],
  'Palghar, Maharashtra': [72.7656, 19.6967],
  'Kolhapur, Maharashtra': [74.2433, 16.7050],
  'Central District, Goa': [73.8278, 15.4909],
  'East District, Goa': [74.0000, 15.4000],
  'North District, Goa': [73.8000, 15.6000],
  'Bolpur, West Bengal': [87.6858, 23.6693],
  'Bikna, West Bengal': [87.0700, 23.2400],
  'Pingla, West Bengal': [87.4667, 22.3667],
  'Nadia, West Bengal': [88.5565, 23.4710],
  'Raghurajpur, Odisha': [85.8300, 19.9100],
  'Pipili, Odisha': [85.8333, 20.1167],
  'Cuttack, Odisha': [85.8830, 20.4625],
  'Jitwarpur, Bihar': [86.0800, 26.1300],
  'Muzaffarpur, Bihar': [85.3910, 26.1197],
  'Patna, Bihar': [85.1376, 25.5941],
  'Central District, Jharkhand': [85.3096, 23.3441],
  'East District, Jharkhand': [85.5000, 23.3000],
  'North District, Jharkhand': [85.2000, 23.6000],
  'Ashoknagar, Madhya Pradesh': [77.7300, 24.5800],
  'Khargone, Madhya Pradesh': [75.6100, 21.8200],
  'Dhar, Madhya Pradesh': [75.3000, 22.6000],
  'Central District, Chhattisgarh': [81.6296, 21.2514],
  'East District, Chhattisgarh': [81.8000, 21.2000],
  'North District, Chhattisgarh': [81.6000, 21.5000],
  'Sualkuchi, Assam': [91.5700, 26.1700],
  'Kamrup, Assam': [91.5000, 26.1500],
  'Barpeta, Assam': [91.0000, 26.3200],
  'Central District, Nagaland': [94.1086, 25.6751],
  'East District, Nagaland': [94.3000, 25.7000],
  'North District, Nagaland': [94.1000, 25.9000],
  'Central District, Manipur': [93.9368, 24.8170],
  'East District, Manipur': [94.1000, 24.8000],
  'North District, Manipur': [93.9000, 25.0000],
  'Central District, Meghalaya': [91.8933, 25.5788],
  'East District, Meghalaya': [92.1000, 25.5000],
  'North District, Meghalaya': [91.9000, 25.8000],
  'Central District, Arunachal Pradesh': [93.6053, 27.0844],
  'East District, Arunachal Pradesh': [94.0000, 27.5000],
  'North District, Arunachal Pradesh': [93.7000, 27.5000],
  'Central District, Tripura': [91.2868, 23.8315],
  'East District, Tripura': [91.5000, 23.8000],
  'North District, Tripura': [91.3000, 24.1000],
  'Central District, Mizoram': [92.7176, 23.7271],
  'East District, Mizoram': [92.9000, 23.7000],
  'North District, Mizoram': [92.7000, 24.0000],
  'Central District, Sikkim': [88.6138, 27.3389],
  'East District, Sikkim': [88.8000, 27.3000],
  'North District, Sikkim': [88.6000, 27.6000],
  'Srikalahasti, Andhra Pradesh': [79.7000, 13.7500],
  'Krishna, Andhra Pradesh': [80.9000, 16.5000],
  'Yadadri Bhuvanagiri, Telangana': [78.9000, 17.5500],
  'Hyderabad, Telangana': [78.4867, 17.3850],
  'Karimnagar, Telangana': [79.1288, 18.4386],
  'Mysuru, Karnataka': [76.6394, 12.2958],
  'Ramanagara, Karnataka': [77.2800, 12.7200],
  'Kanchipuram, Tamil Nadu': [79.7036, 12.8342],
  'Thanjavur, Tamil Nadu': [79.1378, 10.7870],
  'Pathanamthitta, Kerala': [76.7870, 9.2648],
  'Alappuzha, Kerala': [76.3388, 9.4981],
};

// Small deterministic jitter so multiple artisans in one town don't stack.
function jitter(coord, i) {
  const d = 0.02; // ~2 km
  const dx = ((i * 37) % 100 / 100 - 0.5) * d;
  const dy = ((i * 53) % 100 / 100 - 0.5) * d;
  return [coord[0] + dx, coord[1] + dy];
}

// Vary trust tiers across artisans so the trust ladder + pricing show range.
// ~55% Tier-1 (40), ~30% Tier-2 (60), ~15% Tier-3 (100).
function trustFor(i) {
  const r = (i * 41) % 100; // deterministic spread
  if (r < 55) return 40;
  if (r < 85) return 60;
  return 100;
}

// Rate scales with trust. Higher trust → higher workshop price.
function priceFor(trust) {
  if (trust >= 100) return 2500; // top-rated, in demand
  if (trust >= 60) return 1800;  // established
  return 1000;                   // entry / newly verified
}

// Verification reflects the trust tier.
function buildVerification(craft, i) {
  const trust = trustFor(i);
  const v = {
    tier1: {
      status: 'PASS', docType: 'PEHCHAN', formatValid: true,
      claimedGi: craft, giFound: true, giDistrictMatch: true,
      reason: 'Document verified · craft matches registered district',
      ocrConfidence: 92, checkedAt: new Date(),
    },
    tier2: { endorsements: [], status: 'NONE' },
    tier3: { reviewCount: 0, avgRating: 0 },
  };
  if (trust >= 60) v.tier2.status = 'CORROBORATED';
  if (trust >= 100) { v.tier3.reviewCount = 12; v.tier3.avgRating = 4.7; }
  return v;
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('Missing MONGO_URI in .env'); process.exit(1); }

  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'artisans.json'), 'utf-8'));

  const missing = new Set();
  const docs = raw.map((a, i) => {
    const coord = PLACE_COORDS[a.place];
    if (!coord) { missing.add(a.place); return null; }
    const [district, state] = a.place.split(',').map(s => s.trim());
    const trust = trustFor(i);
    return {
      name: a.name,
      craft: a.craft,
      claimedGi: a.craft,
      district,
      state,
      location: { type: 'Point', coordinates: jitter(coord, i) },
      languages: ['Hindi', 'English'],
      verification: buildVerification(a.craft, i),
      trustScore: trust,
      availability: { state: 'REQUEST_AND_CONFIRM', source: 'DEFAULT', updatedAt: new Date() },
      workshop: {
        title: `${a.craft} Workshop`,
        durationMins: 90,
        priceInr: priceFor(trust),
        capacity: 4,
      },
      isDemo: false,
    };
  }).filter(Boolean);

  if (missing.size) {
    console.warn('WARNING — no coordinates for these places (skipped):');
    [...missing].forEach(p => console.warn('  •', p));
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const del = await Artisan.deleteMany({ isDemo: false });
  console.log(`Cleared ${del.deletedCount} existing non-demo artisans`);

  const inserted = await Artisan.insertMany(docs, { ordered: false });
  console.log(`Inserted ${inserted.length} artisans across ${new Set(docs.map(d => d.state)).size} states`);

  // Quick breakdown so you can see the spread
  const t40 = docs.filter(d => d.trustScore === 40).length;
  const t60 = docs.filter(d => d.trustScore === 60).length;
  const t100 = docs.filter(d => d.trustScore === 100).length;
  console.log(`Trust spread → 40: ${t40} (₹1000) · 60: ${t60} (₹1800) · 100: ${t100} (₹2500)`);

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });