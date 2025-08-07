const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Database connection
mongoose.connect('mongodb://localhost:27017/movie_booking_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Swagger documentation setup
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Movie Booking API',
      version: '1.0.0',
      description: 'API for movie ticket booking application'
    },
    servers: [
      {
        url: 'http://localhost:3000'
      }
    ]
  },
  apis: ['./server.js']
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Database schemas
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

// Models
const User = mongoose.model('User', userSchema);
const Movie = mongoose.model('Movie', movieSchema);
const Screening = mongoose.model('Screening', screeningSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  
  jwt.verify(token, 'SECRET_KEY', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      'SECRET_KEY',
      { expiresIn: '1h' }
    );
    
    res.json({ token, userId: user._id, role: user.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Get all active movies
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of movies
 */
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await Movie.find({ isActive: true });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Get movie by ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Movie details
 *       404:
 *         description: Movie not found
 */
app.get('/api/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Add a new movie
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - duration
 *               - genre
 *               - releaseDate
 *               - poster
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: number
 *               genre:
 *                 type: array
 *                 items:
 *                   type: string
 *               releaseDate:
 *                 type: string
 *                 format: date
 *               poster:
 *                 type: string
 *     responses:
 *       201:
 *         description: Movie created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
app.post('/api/movies', authenticateToken, isAdmin, async (req, res) => {
  try {
    const movie = new Movie(req.body);
    const newMovie = await movie.save();
    res.status(201).json(newMovie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/screenings:
 *   get:
 *     summary: Get all screenings
 *     tags: [Screenings]
 *     responses:
 *       200:
 *         description: List of screenings
 */
app.get('/api/screenings', async (req, res) => {
  try {
    const screenings = await Screening.find().populate('movieId');
    res.json(screenings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/screenings/movie/{movieId}:
 *   get:
 *     summary: Get screenings by movie ID
 *     tags: [Screenings]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of screenings for a movie
 */
app.get('/api/screenings/movie/:movieId', async (req, res) => {
  try {
    const screenings = await Screening.find({ movieId: req.params.movieId }).populate('movieId');
    res.json(screenings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/screenings:
 *   post:
 *     summary: Add a new screening
 *     tags: [Screenings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *               - startTime
 *               - endTime
 *               - theater
 *               - capacity
 *               - availableSeats
 *               - price
 *             properties:
 *               movieId:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               theater:
 *                 type: string
 *               capacity:
 *                 type: number
 *               availableSeats:
 *                 type: number
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Screening created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
app.post('/api/screenings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const screening = new Screening(req.body);
    const newScreening = await screening.save();
    res.status(201).json(newScreening);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - screeningId
 *               - seats
 *             properties:
 *               screeningId:
 *                 type: string
 *               seats:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid request or seats not available
 *       401:
 *         description: Unauthorized
 */
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { screeningId, seats } = req.body;
    const userId = req.user.id;
    
    // Find screening
    const screening = await Screening.findById(screeningId);
    if (!screening) {
      return res.status(404).json({ message: 'Screening not found' });
    }
    
    // Check if enough seats available
    if (screening.availableSeats < seats.length) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }
    
    // Create booking
    const totalAmount = seats.length * screening.price;
    const booking = new Booking({
      userId,
      screeningId,
      seats,
      totalAmount
    });
    
    // Update available seats
    screening.availableSeats -= seats.length;
    await screening.save();
    
    const newBooking = await booking.save();
    
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/bookings/{id}/payment:
 *   post:
 *     summary: Process payment for a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - cardDetails
 *             properties:
 *               paymentMethod:
 *                 type: string
 *               cardDetails:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Invalid request or payment failed
 *       401:
 *         description: Unauthorized
 */
app.post('/api/bookings/:id/payment', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if user owns this booking
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to process this booking' });
    }
    
    // Process payment (in a real app, this would integrate with a payment gateway)
    booking.paymentStatus = 'completed';
    await booking.save();
    
    res.json({ message: 'Payment processed successfully', booking });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/bookings/user:
 *   get:
 *     summary: Get all bookings for the authenticated user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 *       401:
 *         description: Unauthorized
 */
app.get('/api/bookings/user', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('screeningId')
      .sort({ bookingTime: -1 });
    
    // Populate movie details for each booking
    const populatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const bookingObj = booking.toObject();
        if (bookingObj.screeningId && bookingObj.screeningId.movieId) {
          const movie = await Movie.findById(bookingObj.screeningId.movieId);
          bookingObj.movie = movie;
        }
        return bookingObj;
      })
    );
    
    res.json(populatedBookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Server start
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;