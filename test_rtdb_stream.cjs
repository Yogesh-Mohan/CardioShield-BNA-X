/**
 * test_rtdb_stream.js
 * Node script to push a live test sensor packet to Firebase Realtime Database
 * via REST API so we can verify if it streams into the website!
 */

const https = require('https');

const DB_URL = "https://cardioshield-dna-x-default-rtdb.firebaseio.com/live_sensors.json";

const payload = JSON.stringify({
  heartRate: 88,
  gsr: 2.85,
  temperature: 37.2,
  ecg: 0.95,
  rrInterval: 681,
  hrvSdnn: 52.4,
  stLevel: 0.03,
  rAmplitude: 1.25,
  signalQuality: 0.99,
  scenario: "REALTIME_LIVE",
  timestamp: Date.now()
});

const url = new URL(DB_URL);

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    console.log(`[RTDB PUSH STATUS]: ${res.statusCode}`);
    console.log(`[RTDB RESPONSE]: ${responseData}`);
  });
});

req.on('error', (e) => {
  console.error(`[RTDB ERROR]: ${e.message}`);
});

req.write(payload);
req.end();
