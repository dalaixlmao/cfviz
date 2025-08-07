# Movie Booking Management App

A comprehensive movie ticket booking application with robust APIs for user authentication, movie browsing, seat selection, booking management, and payment processing.

## Features

- User authentication and registration
- Movie catalog browsing and search
- Screening schedules and theater information
- Interactive seat selection
- Secure booking and payment processing
- Booking history and management

## API Documentation

The API is documented using OpenAPI 3.0 specification. When the server is running, you can access the Swagger UI documentation at:

```
http://localhost:3000/api-docs
```

## Project Structure

```
├── server/              # Server-side code
│   ├── server.js        # Express application entry point
│   ├── openapi.yml      # API specification
│   └── package.json     # Server dependencies
├── tests/               # Testing directory
│   ├── api.test.js      # API unit tests
│   ├── contract/        # Contract testing (Dredd)
│   └── performance/     # Performance testing (k6)
└── reports.codexhub.ai/ # Test reports and analysis
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install testing dependencies (in root directory)
cd ..
npm install
```

### Running the Server

```bash
cd server
npm start
```

The server will start on http://localhost:3000 by default.

### Running Tests

```bash
# Run API tests
npm run test-api

# Run contract tests
npm run test-contract

# Run load tests for authentication
npm run test-load-auth

# Run load tests for booking flow
npm run test-load-booking

# Run all tests
npm test
```

## Test Reports

Comprehensive test reports are available in the `reports.codexhub.ai` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.