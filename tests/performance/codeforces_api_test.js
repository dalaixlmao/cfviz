// Performance test script for Codeforces API integration
// Designed for k6 but written to be readable if k6 is not available

import { sleep, check, group } from 'k6';
import http from 'k6/http';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const userStatusDuration = new Trend('user_status_duration');
const userRatingDuration = new Trend('user_rating_duration');
const errorRate = new Rate('error_rate');
const apiRequestCount = new Counter('api_requests');
const dataProcessingTime = new Trend('data_processing_time');

// Codeforces API base URL
const API_BASE_URL = 'https://codeforces.com/api/';

// Test handles of different sizes
const handles = [
  'tourist',       // Very active user with many submissions
  'Petr',          // Another top coder with many submissions
  'jiangly',       // Active competitive programmer
  'Um_nik',        // Medium activity user
  'newbie12345'    // Low activity/fictional user for testing
];

// Test configuration
export const options = {
  scenarios: {
    // Test with a single user making repeated API calls
    single_user: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '3s', // 1 request every 3 seconds
      duration: '30s',
      preAllocatedVUs: 1,
      maxVUs: 5,
      exec: 'singleUserTest'
    },
    
    // Simulate multiple concurrent users
    concurrent_users: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '20s', target: 10 },  // Ramp up to 10 users over 20 seconds
        { duration: '30s', target: 10 },  // Stay at 10 users for 30 seconds
        { duration: '10s', target: 0 }    // Ramp down to 0 users over 10 seconds
      ],
      exec: 'concurrentUsersTest'
    }
  },
  thresholds: {
    'user_status_duration': ['p(95)<3000'], // 95% of requests should be below 3 seconds
    'user_rating_duration': ['p(95)<1000'], // 95% of requests should be below 1 second
    'error_rate': ['rate<0.1'],            // Less than 10% errors
  },
};

// Test for single user making sequential API calls
export function singleUserTest() {
  const handle = handles[Math.floor(Math.random() * handles.length)];
  
  group('User Status API', function() {
    const startTime = new Date().getTime();
    apiRequestCount.add(1);
    
    const statusRes = http.get(`${API_BASE_URL}user.status?handle=${handle}`);
    userStatusDuration.add(new Date().getTime() - startTime);
    
    check(statusRes, {
      'status is 200': (r) => r.status === 200,
      'has result field': (r) => r.json('status') === 'OK',
    });
    
    if (statusRes.status !== 200) {
      errorRate.add(1);
      console.log(`Error fetching user.status for ${handle}: ${statusRes.status} - ${statusRes.body}`);
    } else {
      // Simulate data processing time
      const processingStart = new Date().getTime();
      
      try {
        const submissions = statusRes.json('result');
        
        // Simulate data processing for visualization
        const verdicts = {};
        const langs = {};
        const tags = {};
        const levels = {};
        const problems = {};
        
        for (let i = 0; i < submissions.length; i++) {
          const sub = submissions[i];
          
          // Count verdicts
          if (verdicts[sub.verdict] === undefined) verdicts[sub.verdict] = 1;
          else verdicts[sub.verdict]++;
          
          // Count languages
          if (langs[sub.programmingLanguage] === undefined) langs[sub.programmingLanguage] = 1;
          else langs[sub.programmingLanguage]++;
          
          // Process problem tags
          if (sub.problem.tags) {
            sub.problem.tags.forEach(tag => {
              if (tags[tag] === undefined) tags[tag] = 1;
              else tags[tag]++;
            });
          }
          
          // Count problem levels
          if (sub.problem.index) {
            const level = sub.problem.index[0];
            if (levels[level] === undefined) levels[level] = 1;
            else levels[level]++;
          }
          
          // Track unique problems
          const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
          if (!problems[problemId]) {
            problems[problemId] = {
              attempts: 1,
              solved: sub.verdict === 'OK' ? 1 : 0
            };
          } else {
            problems[problemId].attempts++;
            if (sub.verdict === 'OK') problems[problemId].solved++;
          }
        }
        
        // Calculate statistics
        const totalSubs = submissions.length;
        const uniqueProblems = Object.keys(problems).length;
        const solvedProblems = Object.values(problems).filter(p => p.solved > 0).length;
        
        // Log processing results
        console.log(`Processed ${totalSubs} submissions for ${handle}: ${uniqueProblems} unique problems, ${solvedProblems} solved`);
        
        dataProcessingTime.add(new Date().getTime() - processingStart);
      } catch (error) {
        console.error(`Error processing data for ${handle}: ${error}`);
        errorRate.add(1);
      }
    }
    
    // Add a small delay between requests to avoid rate limiting
    sleep(1);
  });
  
  group('User Rating API', function() {
    const startTime = new Date().getTime();
    apiRequestCount.add(1);
    
    const ratingRes = http.get(`${API_BASE_URL}user.rating?handle=${handle}`);
    userRatingDuration.add(new Date().getTime() - startTime);
    
    check(ratingRes, {
      'status is 200': (r) => r.status === 200,
      'has result field': (r) => r.json('status') === 'OK',
    });
    
    if (ratingRes.status !== 200) {
      errorRate.add(1);
      console.log(`Error fetching user.rating for ${handle}: ${ratingRes.status} - ${ratingRes.body}`);
    } else {
      // Simulate processing rating data
      try {
        const ratingChanges = ratingRes.json('result');
        
        // Calculate statistics
        let bestRank = Infinity;
        let worstRank = -1;
        let maxUp = -Infinity;
        let maxDown = Infinity;
        
        for (let i = 0; i < ratingChanges.length; i++) {
          const change = ratingChanges[i];
          
          // Track best and worst ranks
          if (change.rank < bestRank) bestRank = change.rank;
          if (change.rank > worstRank) worstRank = change.rank;
          
          // Track max rating changes
          const delta = change.newRating - change.oldRating;
          if (delta > maxUp) maxUp = delta;
          if (delta < maxDown) maxDown = delta;
        }
        
        // Log processing results
        console.log(`Processed ${ratingChanges.length} contests for ${handle}: Best rank ${bestRank}, worst rank ${worstRank}, max up ${maxUp}, max down ${maxDown}`);
      } catch (error) {
        console.error(`Error processing rating data for ${handle}: ${error}`);
        errorRate.add(1);
      }
    }
  });
  
  // Reasonable delay between user API call sequences to avoid rate limiting
  sleep(Math.random() * 2 + 3);
}

// Test for multiple concurrent users
export function concurrentUsersTest() {
  // Select a random handle for this virtual user
  const handleIndex = Math.floor(Math.random() * handles.length);
  const handle = handles[handleIndex];
  
  // First request: user.status
  const statusRes = http.get(`${API_BASE_URL}user.status?handle=${handle}`);
  check(statusRes, {
    'status API successful': (r) => r.status === 200,
  });
  
  if (statusRes.status !== 200) {
    errorRate.add(1);
    console.log(`Concurrent test: Error fetching user.status for ${handle}: ${statusRes.status}`);
  }
  
  // Small delay between API calls
  sleep(Math.random() * 1 + 0.5);
  
  // Second request: user.rating
  const ratingRes = http.get(`${API_BASE_URL}user.rating?handle=${handle}`);
  check(ratingRes, {
    'rating API successful': (r) => r.status === 200,
  });
  
  if (ratingRes.status !== 200) {
    errorRate.add(1);
    console.log(`Concurrent test: Error fetching user.rating for ${handle}: ${ratingRes.status}`);
  }
  
  // Variable sleep to simulate user think time
  sleep(Math.random() * 3 + 2);
}

export default function() {
  singleUserTest();
}