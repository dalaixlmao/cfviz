const hooks = require('hooks');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

let mongoServer;
let token;
let userId;
let movieId;
let screeningId;
let bookingId;

// Before API Blueprint is loaded
hooks.beforeAll(async (transactions) => {
  console.log('Setting up test environment...');
  
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Define schemas
  const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
  });

  const movieSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    genre: { type: [String], required: true },
    releaseDate: { type: Date, required: true },
    poster: { type: String, required: true },
    rating: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  });

  const screeningSchema = new mongoose.Schema({
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    theater: { type: String, required: true },
    capacity: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
    price: { type: Number, required: true }
  });

  const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    screeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'Screening', required: true },
    seats: { type: [String], required: true },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    bookingTime: { type: Date, default: Date.now }
  });

  // Create models
  const User = mongoose.model('User', userSchema);
  const Movie = mongoose.model('Movie', movieSchema);
  const Screening = mongoose.model('Screening', screeningSchema);
  const Booking = mongoose.model('Booking', bookingSchema);

  // Seed the database with test data
  // Create an admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = new User({
    username: 'admin',
    email: 'admin@example.com',
    password: adminPassword,
    role: 'admin'
  });
  await admin.save();

  // Create a regular user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = new User({
    username: 'testuser',
    email: 'test@example.com',
    password: userPassword,
    role: 'user'
  });
  const savedUser = await user.save();
  userId = savedUser._id;

  // Create a movie
  const movie = new Movie({
    title: 'Test Movie',
    description: 'A test movie description',
    duration: 120,
    genre: ['Action', 'Adventure'],
    releaseDate: new Date('2025-01-01'),
    poster: 'https://example.com/poster.jpg',
    isActive: true
  });
  const savedMovie = await movie.save();
  movieId = savedMovie._id;

  // Create a screening
  const screening = new Screening({
    movieId: movieId,
    startTime: new Date('2025-08-15T18:00:00Z'),
    endTime: new Date('2025-08-15T20:00:00Z'),
    theater: 'Screen 1',
    capacity: 100,
    availableSeats: 100,
    price: 10.5
  });
  const savedScreening = await screening.save();
  screeningId = savedScreening._id;

  // Create a booking
  const booking = new Booking({
    userId: userId,
    screeningId: screeningId,
    seats: ['A1', 'A2'],
    totalAmount: 21.0,
    paymentStatus: 'pending'
  });
  const savedBooking = await booking.save();
  bookingId = savedBooking._id;

  // Create auth token for API calls
  token = jwt.sign(
    { id: userId, username: 'testuser', role: 'user' },
    'SECRET_KEY',
    { expiresIn: '1h' }
  );

  console.log('Test environment setup completed');
});

// After API Blueprint was loaded, but before any HTTP transaction is executed
hooks.beforeEach((transaction) => {
  // Skip some validation for specific endpoints or scenarios
  if (transaction.request.uri.includes('/api/auth/register') && 
      transaction.name.includes('already exists')) {
    transaction.skip = true;
  }

  // Add authentication token for protected endpoints
  if (transaction.request.uri.includes('/api/bookings') || 
      transaction.request.uri.includes('/api/movies') && transaction.request.method === 'POST') {
    transaction.request.headers['Authorization'] = `Bearer ${token}`;
  }

  // Prepare request bodies
  if (transaction.request.uri.includes('/api/auth/register')) {
    const uniqueId = Date.now();
    transaction.request.body = JSON.stringify({
      username: `user${uniqueId}`,
      email: `user${uniqueId}@example.com`,
      password: 'Password123!'
    });
  }

  if (transaction.request.uri.includes('/api/auth/login')) {
    transaction.request.body = JSON.stringify({
      username: 'testuser',
      password: 'user123'
    });
  }

  if (transaction.request.uri.includes('/api/bookings') && transaction.request.method === 'POST') {
    transaction.request.body = JSON.stringify({
      screeningId: screeningId.toString(),
      seats: ['B1', 'B2']
    });
  }

  if (transaction.request.uri.includes('/api/bookings') && transaction.request.uri.includes('/payment')) {
    transaction.request.body = JSON.stringify({
      paymentMethod: 'credit_card',
      cardDetails: {
        number: 'xxxx-xxxx-xxxx-1234',
        expiryMonth: '09',
        expiryYear: '26',
        cvv: '123'
      }
    });
  }
});

// Replace path parameters in URLs
hooks.beforeEach((transaction) => {
  if (transaction.request.uri.includes('/{id}')) {
    transaction.request.uri = transaction.request.uri.replace('{id}', bookingId.toString());
  }
  
  if (transaction.request.uri.includes('/{movieId}')) {
    transaction.request.uri = transaction.request.uri.replace('{movieId}', movieId.toString());
  }
});

// After all transactions are executed
hooks.afterAll(async (transactions) => {
  // Cleanup
  if (mongoose.connection) {
    await mongoose.connection.close();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('Test environment cleanup completed');
});

module.exports = hooks;