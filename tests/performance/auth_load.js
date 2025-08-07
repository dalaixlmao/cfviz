import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const loginSuccess = new Counter('login_success');
const loginFailure = new Counter('login_failure');
const registrationSuccess = new Counter('registration_success');
const registrationFailure = new Counter('registration_failure');
const errorRate = new Rate('error_rate');
const loginTrend = new Trend('login_time');
const registerTrend = new Trend('register_time');

// Configuration
const BASE_URL = 'http://localhost:3000';

export const options = {
  scenarios: {
    // Constant load test
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
    },
    // Ramping load test
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'login_time': ['p(95)<300'],        // 95% of logins under 300ms
    'register_time': ['p(95)<500'],     // 95% of registrations under 500ms
    'error_rate': ['rate<0.1'],         // Less than 10% error rate
  },
};

// Default function - runs for each VU
export default function () {
  // Generate unique user data for this iteration
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 100000);
  const username = `testuser_${timestamp}_${randomId}`;
  const email = `testuser_${timestamp}_${randomId}@example.com`;
  const password = 'Password123!';
  
  // 50% of requests will register a new user, 50% will try to login
  if (Math.random() < 0.5) {
    // Register a new user
    const startTime = new Date().getTime();
    const registerRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
      username: username,
      email: email,
      password: password
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    registerTrend.add(new Date().getTime() - startTime);
    
    check(registerRes, {
      'registration successful': (r) => r.status === 201,
    });
    
    if (registerRes.status === 201) {
      registrationSuccess.add(1);
    } else {
      registrationFailure.add(1);
      errorRate.add(1);
    }
  } else {
    // Login with an existing user
    // In a real test, you might want to use a pool of pre-registered users
    // For this example, we'll try to login with the same credentials, which may fail
    // if the user doesn't exist yet
    
    const startTime = new Date().getTime();
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      username: 'testuser', // Using a fixed username for the login test
      password: 'Password123!'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    loginTrend.add(new Date().getTime() - startTime);
    
    check(loginRes, {
      'login status either success or failure': (r) => r.status === 200 || r.status === 401,
    });
    
    if (loginRes.status === 200) {
      loginSuccess.add(1);
      
      // If login is successful, try to access a protected endpoint
      const token = JSON.parse(loginRes.body).token;
      
      const userBookingsRes = http.get(`${BASE_URL}/api/bookings/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      check(userBookingsRes, {
        'authenticated request successful': (r) => r.status === 200,
      });
    } else {
      loginFailure.add(1);
      if (loginRes.status !== 401) {
        // Only count as an error if it's not a 401 (which is expected for invalid credentials)
        errorRate.add(1);
      }
    }
  }
  
  // Add some think time between iterations
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}