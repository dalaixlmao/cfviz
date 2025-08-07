import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const bookingCreations = new Counter('booking_creations');
const bookingErrors = new Counter('booking_errors');
const paymentSuccess = new Counter('payment_success');
const paymentFailure = new Counter('payment_failures');
const apiErrorRate = new Rate('api_errors');
const movieSearchTrend = new Trend('movie_search_time');
const seatSelectionTrend = new Trend('seat_selection_time');
const bookingCreationTrend = new Trend('booking_creation_time');
const paymentProcessingTrend = new Trend('payment_processing_time');

// Configuration
const BASE_URL = 'http://localhost:3000';
let authToken = '';
let userId = '';

export const options = {
  scenarios: {
    // Baseline test
    baseline: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 iterations per second
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
    // Stress test
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 200,
      stages: [
        { target: 20, duration: '30s' }, // Ramp up to 20 requests per second over 30s
        { target: 50, duration: '1m' },  // Ramp up to 50 requests per second over 1m
        { target: 100, duration: '2m' }, // Ramp up to 100 requests per second over 2m
        { target: 0, duration: '30s' },  // Ramp down to 0 requests
      ],
    },
    // Spike test
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { target: 10, duration: '30s' },   // Normal load
        { target: 200, duration: '10s' },  // Spike to 200 requests per second
        { target: 10, duration: '30s' },   // Back to normal
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95% of requests should be below 1s
    'http_req_failed': ['rate<0.01'],    // Less than 1% of requests should fail
    'movie_search_time': ['p(95)<500'],  // 95% of movie searches under 500ms
    'seat_selection_time': ['p(95)<600'], // 95% of seat selections under 600ms
    'booking_creation_time': ['p(95)<800'], // 95% of bookings created under 800ms
    'payment_processing_time': ['p(95)<1000'], // 95% of payments processed under 1s
  },
};

// Setup function - runs once before the test
export function setup() {
  // Register a test user
  const registerRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
    username: `testuser_${Date.now()}`,
    email: `testuser_${Date.now()}@example.com`,
    password: 'Password123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Login to get auth token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    username: `testuser_${Date.now()}`,
    password: 'Password123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => JSON.parse(r.body).token !== undefined,
  });
  
  const loginData = JSON.parse(loginRes.body);
  return {
    token: loginData.token,
    userId: loginData.userId,
  };
}

// Default function - runs for each VU
export default function (data) {
  // Set auth token from setup
  authToken = data.token;
  userId = data.userId;
  
  // Step 1: Search for movies
  let startTime = new Date().getTime();
  const moviesRes = http.get(`${BASE_URL}/api/movies`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  movieSearchTrend.add(new Date().getTime() - startTime);
  
  check(moviesRes, {
    'movies retrieved': (r) => r.status === 200,
    'movies data found': (r) => JSON.parse(r.body).length > 0,
  });
  
  if (moviesRes.status !== 200) {
    apiErrorRate.add(1);
    sleep(1);
    return;
  }
  
  // Select a random movie from the list
  const movies = JSON.parse(moviesRes.body);
  if (movies.length === 0) {
    console.log('No movies found in the system');
    apiErrorRate.add(1);
    sleep(1);
    return;
  }
  
  const selectedMovie = movies[Math.floor(Math.random() * movies.length)];
  
  // Step 2: Get screenings for the selected movie
  startTime = new Date().getTime();
  const screeningsRes = http.get(`${BASE_URL}/api/screenings/movie/${selectedMovie._id}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  seatSelectionTrend.add(new Date().getTime() - startTime);
  
  check(screeningsRes, {
    'screenings retrieved': (r) => r.status === 200,
  });
  
  if (screeningsRes.status !== 200) {
    apiErrorRate.add(1);
    sleep(1);
    return;
  }
  
  const screenings = JSON.parse(screeningsRes.body);
  if (screenings.length === 0) {
    console.log('No screenings found for the selected movie');
    apiErrorRate.add(1);
    sleep(1);
    return;
  }
  
  const selectedScreening = screenings[Math.floor(Math.random() * screenings.length)];
  
  // Step 3: Create a booking with random seats
  const availableSeats = selectedScreening.availableSeats;
  if (availableSeats < 2) {
    console.log('Not enough seats available for booking');
    apiErrorRate.add(1);
    sleep(1);
    return;
  }
  
  // Generate 1-3 random seats
  const seatCount = Math.floor(Math.random() * 3) + 1;
  const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  let selectedSeats = [];
  
  for (let i = 0; i < seatCount; i++) {
    const row = seatLetters[Math.floor(Math.random() * seatLetters.length)];
    const num = Math.floor(Math.random() * 20) + 1;
    selectedSeats.push(`${row}${num}`);
  }
  
  startTime = new Date().getTime();
  const bookingRes = http.post(`${BASE_URL}/api/bookings`, JSON.stringify({
    screeningId: selectedScreening._id,
    seats: selectedSeats,
  }), {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  bookingCreationTrend.add(new Date().getTime() - startTime);
  
  check(bookingRes, {
    'booking created': (r) => r.status === 201,
  });
  
  if (bookingRes.status === 201) {
    bookingCreations.add(1);
  } else {
    bookingErrors.add(1);
    apiErrorRate.add(1);
    sleep(1);
    return;
  }
  
  const booking = JSON.parse(bookingRes.body);
  
  // Step 4: Process payment for the booking
  startTime = new Date().getTime();
  const paymentRes = http.post(`${BASE_URL}/api/bookings/${booking._id}/payment`, JSON.stringify({
    paymentMethod: 'credit_card',
    cardDetails: {
      number: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2030',
      cvv: '123'
    }
  }), {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  paymentProcessingTrend.add(new Date().getTime() - startTime);
  
  check(paymentRes, {
    'payment processed': (r) => r.status === 200,
  });
  
  if (paymentRes.status === 200) {
    paymentSuccess.add(1);
  } else {
    paymentFailure.add(1);
    apiErrorRate.add(1);
  }
  
  // Step 5: Verify booking in user's bookings
  const userBookingsRes = http.get(`${BASE_URL}/api/bookings/user`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  check(userBookingsRes, {
    'user bookings retrieved': (r) => r.status === 200,
  });
  
  // Add some think time between iterations
  sleep(Math.random() * 3 + 2); // Random sleep between 2-5 seconds
}