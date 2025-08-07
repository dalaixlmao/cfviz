# API Inventory Report for cf-viz

**Date**: August 7, 2025  
**Repository**: cf-viz  
**Analysis By**: API Testing Specialist

## 1. Repository Overview

The cf-viz repository appears to be a visualization tool for Codeforces user statistics rather than a movie booking application as suggested by some of the repository files. The codebase consists primarily of frontend HTML, CSS, and JavaScript files that interact directly with the Codeforces API.

### 1.1 Repository Structure

```
/
├── .git/                   # Git repository data
├── .gitignore              # Git ignore file
├── .prettierrc             # Prettier configuration
├── README.md               # Repository documentation (Movie Booking App)
├── about.html              # About page for cf-viz
├── compare.html            # Page for comparing Codeforces users
├── images/                 # Image assets
├── index.html              # Main page for cf-viz
├── js/                     # JavaScript files
│   ├── calculate.js        # Calculation logic for statistics
│   ├── compare.js          # Code for comparison functionality
│   ├── compare_helper.js   # Helper functions for comparison
│   ├── single.js           # Single user statistics functionality
│   └── vir.js              # Virtual rating change functionality
├── manifest.json           # Web app manifest
├── package.json            # NPM package configuration (Movie Booking App tests)
├── reports.codexhub.ai/    # Reports directory
├── server/                 # Server code (Movie Booking App API)
│   ├── openapi.yml         # OpenAPI specification (Movie Booking App)
│   ├── package.json        # Server dependencies (Movie Booking App)
│   └── server.js           # Server implementation (Movie Booking App)
├── styles/                 # CSS styles
│   └── style.css           # Main stylesheet
├── sw.js                   # Service worker
├── tests/                  # Test files (Movie Booking App)
└── virtual-rating-change.html  # Page for virtual rating changes
```

## 2. API Architecture Findings

### 2.1 Summary of Repository Mismatch

There appears to be a significant mismatch between the actual repository content and some files present in it:

1. The repository's actual content is a frontend application for Codeforces visualization (cf-viz)
2. However, the repository contains server code, tests, and documentation for a completely different application (Movie Booking App)
3. The README.md describes a Movie Booking Management App which doesn't match the actual frontend code

### 2.2 Actual Frontend Application (cf-viz)

The actual frontend application in this repository is a Codeforces visualization tool that:
- Allows users to view statistics for individual Codeforces users
- Provides a comparison feature for multiple users
- Visualizes various metrics like problem tags, difficulty levels, submissions over time, etc.
- Has no backend component of its own, but directly interfaces with the Codeforces API

### 2.3 External API Integration

The frontend application directly integrates with the official Codeforces API without any backend intermediary.

## 3. Codeforces API Integration Points

### 3.1 API Base URL

```javascript
var api_url = 'https://codeforces.com/api/';
```

### 3.2 API Endpoints Used

| Endpoint | Purpose | File | Implementation |
|----------|---------|------|----------------|
| `user.status` | Fetch all submissions of a user | `js/single.js` | Direct AJAX call using jQuery `$.get()` |
| `user.rating` | Fetch rating changes history | `js/single.js` | Direct AJAX call using jQuery `$.get()` |

### 3.3 Data Processing Flow

1. User enters a Codeforces handle in the input form
2. Frontend makes direct AJAX calls to Codeforces API
3. Response data is processed and transformed client-side
4. Visualizations are generated using Google Charts library

## 4. API Communication Implementation

### 4.1 Direct API Calls

The application makes direct API calls to the Codeforces API without any backend proxy. Example from `single.js`:

```javascript
// getting all the submissions of a user
req1 = $.get(api_url + 'user.status', { handle: handle }, function (data, status) {
  // Data processing logic
});

// With this request we get all the rating changes of the user
req2 = $.get(api_url + 'user.rating', { handle: handle }, function (data, status) {
  // Data processing logic
});
```

### 4.2 Error Handling

Basic error handling is implemented for API calls:

```javascript
.fail(function (xhr, status) {
  if (status != 'abort') err_message('handleDiv', "Couldn't find user");
})
```

## 5. Movie Booking API (Mismatched Files)

The repository contains files for a Movie Booking API that appears to be unrelated to the main cf-viz application:

### 5.1 OpenAPI Specification

The `server/openapi.yml` defines a RESTful API for a movie booking system with the following endpoints:

| Category | Endpoint | Method | Purpose |
|----------|----------|--------|---------|
| **Authentication** | `/api/auth/register` | POST | Register new user |
| **Authentication** | `/api/auth/login` | POST | Login user |
| **Movies** | `/api/movies` | GET | List all movies |
| **Movies** | `/api/movies` | POST | Add new movie |
| **Movies** | `/api/movies/{id}` | GET | Get movie details |
| **Screenings** | `/api/screenings` | GET | List all screenings |
| **Screenings** | `/api/screenings` | POST | Add new screening |
| **Screenings** | `/api/screenings/movie/{movieId}` | GET | Get screenings by movie |
| **Bookings** | `/api/bookings` | POST | Create new booking |
| **Bookings** | `/api/bookings/{id}/payment` | POST | Process payment |
| **Bookings** | `/api/bookings/user` | GET | Get user bookings |

### 5.2 Server Implementation

The `server/server.js` file implements an Express.js API matching the OpenAPI specification, with MongoDB database integration.

## 6. Conclusion

### 6.1 Repository State

The repository appears to contain two distinct applications:

1. **cf-viz** (Main Application): A frontend-only Codeforces visualization tool that directly integrates with the Codeforces API
2. **Movie Booking App** (Unrelated Files): A complete API specification and implementation for a movie booking system

### 6.2 API Integration Summary

- The actual cf-viz application uses direct AJAX calls to the Codeforces API
- No custom backend or API proxy is implemented for the cf-viz application
- The Codeforces API integration is limited to fetching user submissions and rating history
- The Movie Booking API files appear to be unrelated to the main application

### 6.3 Recommendations

1. **Repository Cleanup**: Remove or separate the unrelated Movie Booking App files
2. **API Documentation**: Create proper documentation for how the application integrates with the Codeforces API
3. **Error Handling**: Improve error handling for API calls, including rate limiting considerations
4. **Consistent README**: Update the README to accurately describe the cf-viz application rather than the Movie Booking App

## Appendix A: Codeforces API Documentation

For reference, the Codeforces API documentation is available at:
https://codeforces.com/apiHelp

The API methods used by this application:
- `user.status`: https://codeforces.com/apiHelp/methods#user.status
- `user.rating`: https://codeforces.com/apiHelp/methods#user.rating