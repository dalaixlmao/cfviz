/**
 * Codeforces API Contract Validator
 * 
 * This script validates the cf-viz application's integration with the Codeforces API
 * by checking that the API calls match the expected schema and that the application
 * correctly handles the response data.
 */

const axios = require('axios');
const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

// Load the Codeforces API schema
const schema = require('./codeforces-api-schema.json');
const ajv = new Ajv({ allErrors: true });

// Extract the relevant schemas for validation
const userStatusResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["OK", "FAILED"] },
    result: { 
      type: "array",
      items: schema.components.schemas.Submission
    }
  },
  required: ["status", "result"]
};

const userRatingResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["OK", "FAILED"] },
    result: { 
      type: "array",
      items: schema.components.schemas.RatingChange
    }
  },
  required: ["status", "result"]
};

// Compile validators
const validateUserStatus = ajv.compile(userStatusResponseSchema);
const validateUserRating = ajv.compile(userRatingResponseSchema);

// Test handles to use for validation
const testHandles = [
  'tourist',
  'Petr',
  'jiangly',
  'Um_nik'
];

// Base Codeforces API URL
const API_BASE_URL = 'https://codeforces.com/api';

/**
 * Validates the user.status endpoint
 */
async function validateUserStatusEndpoint(handle) {
  console.log(`Validating user.status for handle: ${handle}`);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/user.status`, {
      params: { handle }
    });
    
    const valid = validateUserStatus(response.data);
    
    if (!valid) {
      console.error('Contract validation failed for user.status:');
      console.error(validateUserStatus.errors);
      return {
        endpoint: 'user.status',
        handle,
        valid: false,
        errors: validateUserStatus.errors
      };
    } else {
      console.log(`✅ user.status response for ${handle} is valid`);
      
      // Additional validation for frontend processing expectations
      const result = response.data.result;
      const validationResults = validateFrontendExpectations(result, 'status');
      
      return {
        endpoint: 'user.status',
        handle,
        valid: true,
        submissionsCount: result.length,
        frontendValidation: validationResults
      };
    }
  } catch (error) {
    console.error(`Error calling user.status for ${handle}:`, error.message);
    return {
      endpoint: 'user.status',
      handle,
      valid: false,
      error: error.message
    };
  }
}

/**
 * Validates the user.rating endpoint
 */
async function validateUserRatingEndpoint(handle) {
  console.log(`Validating user.rating for handle: ${handle}`);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/user.rating`, {
      params: { handle }
    });
    
    const valid = validateUserRating(response.data);
    
    if (!valid) {
      console.error('Contract validation failed for user.rating:');
      console.error(validateUserRating.errors);
      return {
        endpoint: 'user.rating',
        handle,
        valid: false,
        errors: validateUserRating.errors
      };
    } else {
      console.log(`✅ user.rating response for ${handle} is valid`);
      
      // Additional validation for frontend processing expectations
      const result = response.data.result;
      const validationResults = validateFrontendExpectations(result, 'rating');
      
      return {
        endpoint: 'user.rating',
        handle,
        valid: true,
        contestsCount: result.length,
        frontendValidation: validationResults
      };
    }
  } catch (error) {
    console.error(`Error calling user.rating for ${handle}:`, error.message);
    return {
      endpoint: 'user.rating',
      handle,
      valid: false,
      error: error.message
    };
  }
}

/**
 * Validates that the API response contains all fields expected by the frontend
 */
function validateFrontendExpectations(data, endpointType) {
  const results = {
    valid: true,
    missingFields: [],
    processingIssues: []
  };
  
  if (endpointType === 'status') {
    // Check submission fields required by frontend
    if (data.length > 0) {
      const sampleSubmission = data[0];
      const requiredFields = [
        'problem.contestId', 'problem.name', 'problem.rating', 'problem.tags',
        'problem.index', 'verdict', 'programmingLanguage', 'creationTimeSeconds'
      ];
      
      for (const field of requiredFields) {
        const parts = field.split('.');
        let value = sampleSubmission;
        
        for (const part of parts) {
          value = value?.[part];
          if (value === undefined) break;
        }
        
        if (value === undefined) {
          results.valid = false;
          results.missingFields.push(field);
        }
      }
      
      // Check specific processing logic in single.js
      try {
        // Simulate creating unique problem IDs
        const problems = {};
        data.forEach(sub => {
          const rating = sub.problem.rating === undefined ? 0 : sub.problem.rating;
          const problemId = sub.problem.contestId + '-' + sub.problem.name + '-' + rating;
          
          if (!problems[problemId]) {
            problems[problemId] = {
              attempts: 1,
              solved: sub.verdict === 'OK' ? 1 : 0
            };
          }
        });
      } catch (error) {
        results.valid = false;
        results.processingIssues.push(`Error in problem ID creation: ${error.message}`);
      }
      
      // Check verdict and tag processing
      try {
        const verdicts = {};
        const tags = {};
        
        data.forEach(sub => {
          if (verdicts[sub.verdict] === undefined) verdicts[sub.verdict] = 1;
          else verdicts[sub.verdict]++;
          
          if (sub.problem.tags) {
            sub.problem.tags.forEach(tag => {
              if (tags[tag] === undefined) tags[tag] = 1;
              else tags[tag]++;
            });
          }
        });
      } catch (error) {
        results.valid = false;
        results.processingIssues.push(`Error in verdict/tag processing: ${error.message}`);
      }
    }
  } else if (endpointType === 'rating') {
    // Check rating fields required by frontend
    if (data.length > 0) {
      const sampleRating = data[0];
      const requiredFields = ['contestId', 'rank', 'oldRating', 'newRating'];
      
      for (const field of requiredFields) {
        if (sampleRating[field] === undefined) {
          results.valid = false;
          results.missingFields.push(field);
        }
      }
      
      // Check specific processing logic in single.js
      try {
        // Simulate finding best/worst rank and max rating changes
        let best = Infinity;
        let worst = -Infinity;
        let maxUp = -Infinity;
        let maxDown = Infinity;
        
        data.forEach(con => {
          if (con.rank < best) best = con.rank;
          if (con.rank > worst) worst = con.rank;
          
          const ch = con.newRating - con.oldRating;
          if (ch > maxUp) maxUp = ch;
          if (ch < maxDown) maxDown = ch;
        });
      } catch (error) {
        results.valid = false;
        results.processingIssues.push(`Error in rating change processing: ${error.message}`);
      }
    }
  }
  
  return results;
}

/**
 * Runs the validation for all test handles
 */
async function runValidation() {
  console.log('Starting Codeforces API contract validation');
  
  const results = {
    timestamp: new Date().toISOString(),
    userStatus: [],
    userRating: []
  };
  
  // Validate user.status endpoint
  for (const handle of testHandles) {
    try {
      const result = await validateUserStatusEndpoint(handle);
      results.userStatus.push(result);
      
      // Add a delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Validation failed for ${handle}:`, error);
      results.userStatus.push({
        endpoint: 'user.status',
        handle,
        valid: false,
        error: error.message
      });
    }
  }
  
  // Validate user.rating endpoint
  for (const handle of testHandles) {
    try {
      const result = await validateUserRatingEndpoint(handle);
      results.userRating.push(result);
      
      // Add a delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Validation failed for ${handle}:`, error);
      results.userRating.push({
        endpoint: 'user.rating',
        handle,
        valid: false,
        error: error.message
      });
    }
  }
  
  // Generate summary
  const statusValidCount = results.userStatus.filter(r => r.valid).length;
  const ratingValidCount = results.userRating.filter(r => r.valid).length;
  
  results.summary = {
    userStatusValid: `${statusValidCount}/${testHandles.length}`,
    userRatingValid: `${ratingValidCount}/${testHandles.length}`,
    overallValid: statusValidCount === testHandles.length && ratingValidCount === testHandles.length
  };
  
  // Write results to file
  const resultsDir = path.join(__dirname, '../../reports.codexhub.ai');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultPath = path.join(resultsDir, 'codeforces-api-validation-results.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  
  console.log(`Validation complete. Results written to ${resultPath}`);
  console.log(`Status endpoint valid: ${results.summary.userStatusValid}`);
  console.log(`Rating endpoint valid: ${results.summary.userRatingValid}`);
  console.log(`Overall valid: ${results.summary.overallValid}`);
  
  return results;
}

// Run the validation if called directly
if (require.main === module) {
  runValidation().catch(error => {
    console.error('Validation script error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateUserStatusEndpoint,
  validateUserRatingEndpoint,
  runValidation
};