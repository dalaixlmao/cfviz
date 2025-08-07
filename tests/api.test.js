const request = require('supertest');
const app = require('../server/server');
const mongoose = require('mongoose');

// Mock for the database
jest.mock('mongoose', () => {
  const mUser = {
    findOne: jest.fn(),
    save: jest.fn()
  };
  const mMovie = {
    find: jest.fn(),
    findById: jest.fn()
  };
  const mScreening = {
    find: jest.fn(),
    findById: jest.fn(),
    save: jest.fn()
  };
  const mBooking = {
    find: jest.fn(),
    findById: jest.fn(),
    save: jest.fn()
  };
  
  return {
    connect: jest.fn(),
    Schema: jest.fn(() => ({
      pre: jest.fn(),
      set: jest.fn(),
      virtual: jest.fn()
    })),
    model: jest.fn((modelName) => {
      if (modelName === 'User') return mUser;
      if (modelName === 'Movie') return mMovie;
      if (modelName === 'Screening') return mScreening;
      if (modelName === 'Booking') return mBooking;
      return {};
    }),
    Types: {
      ObjectId: {
        isValid: jest.fn()
      }
    }
  };
});

// Mock for bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(() => 'hashedpassword'),
  compare: jest.fn(() => true)
}));

// Mock for jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'token'),
  verify: jest.fn((token, secret, callback) => {
    callback(null, { id: '123', username: 'testuser', role: 'user' });
  })
}));

describe('Movie Booking API Endpoints', () => {
  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register should create a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      mongoose.model('User').findOne.mockResolvedValue(null);
      mongoose.model('User').save.mockResolvedValue(userData);
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully');
    });
    
    test('POST /api/auth/login should authenticate a user', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123'
      };
      
      mongoose.model('User').findOne.mockResolvedValue({
        _id: '123',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'user'
      });
      
      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('role');
    });
  });
  
  describe('Movie Endpoints', () => {
    test('GET /api/movies should return all active movies', async () => {
      const mockMovies = [
        {
          _id: '1',
          title: 'Test Movie 1',
          description: 'Description 1',
          duration: 120,
          genre: ['Action'],
          releaseDate: new Date(),
          poster: 'poster1.jpg',
          isActive: true
        },
        {
          _id: '2',
          title: 'Test Movie 2',
          description: 'Description 2',
          duration: 140,
          genre: ['Comedy'],
          releaseDate: new Date(),
          poster: 'poster2.jpg',
          isActive: true
        }
      ];
      
      mongoose.model('Movie').find.mockResolvedValue(mockMovies);
      
      const res = await request(app).get('/api/movies');
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
    
    test('GET /api/movies/:id should return a movie by ID', async () => {
      const mockMovie = {
        _id: '1',
        title: 'Test Movie 1',
        description: 'Description 1',
        duration: 120,
        genre: ['Action'],
        releaseDate: new Date(),
        poster: 'poster1.jpg',
        isActive: true
      };
      
      mongoose.model('Movie').findById.mockResolvedValue(mockMovie);
      
      const res = await request(app).get('/api/movies/1');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('title', 'Test Movie 1');
    });
  });
  
  describe('Screening Endpoints', () => {
    test('GET /api/screenings should return all screenings', async () => {
      const mockScreenings = [
        {
          _id: '1',
          movieId: { _id: '1', title: 'Test Movie 1' },
          startTime: new Date(),
          endTime: new Date(),
          theater: 'Theater 1',
          capacity: 100,
          availableSeats: 80,
          price: 10
        }
      ];
      
      mongoose.model('Screening').find.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockScreenings)
      }));
      
      const res = await request(app).get('/api/screenings');
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
    
    test('GET /api/screenings/movie/:movieId should return screenings by movie ID', async () => {
      const mockScreenings = [
        {
          _id: '1',
          movieId: { _id: '1', title: 'Test Movie 1' },
          startTime: new Date(),
          endTime: new Date(),
          theater: 'Theater 1',
          capacity: 100,
          availableSeats: 80,
          price: 10
        }
      ];
      
      mongoose.model('Screening').find.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockScreenings)
      }));
      
      const res = await request(app).get('/api/screenings/movie/1');
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
  
  describe('Booking Endpoints', () => {
    test('POST /api/bookings should create a new booking', async () => {
      const bookingData = {
        screeningId: '1',
        seats: ['A1', 'A2']
      };
      
      mongoose.model('Screening').findById.mockResolvedValue({
        _id: '1',
        availableSeats: 10,
        price: 10,
        save: jest.fn().mockResolvedValue(true)
      });
      
      mongoose.model('Booking').save.mockImplementation(function() {
        return Promise.resolve(this);
      });
      
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer token')
        .send(bookingData);
      
      expect(res.statusCode).toEqual(201);
    });
    
    test('POST /api/bookings/:id/payment should process payment for a booking', async () => {
      const mockBooking = {
        _id: '1',
        userId: '123',
        screeningId: '1',
        seats: ['A1', 'A2'],
        totalAmount: 20,
        paymentStatus: 'pending',
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({})
      };
      
      mongoose.model('Booking').findById.mockResolvedValue(mockBooking);
      
      const res = await request(app)
        .post('/api/bookings/1/payment')
        .set('Authorization', 'Bearer token')
        .send({ paymentMethod: 'credit_card', cardDetails: {} });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Payment processed successfully');
    });
    
    test('GET /api/bookings/user should return user bookings', async () => {
      const mockBookings = [
        {
          _id: '1',
          userId: '123',
          screeningId: {
            _id: '1',
            movieId: '1',
            startTime: new Date(),
            theater: 'Theater 1'
          },
          seats: ['A1', 'A2'],
          totalAmount: 20,
          paymentStatus: 'completed',
          bookingTime: new Date(),
          toObject: jest.fn().mockReturnValue({
            _id: '1',
            userId: '123',
            screeningId: {
              _id: '1',
              movieId: '1',
              startTime: new Date(),
              theater: 'Theater 1'
            },
            seats: ['A1', 'A2'],
            totalAmount: 20,
            paymentStatus: 'completed',
            bookingTime: new Date()
          })
        }
      ];
      
      mongoose.model('Booking').find.mockImplementation(() => ({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockBookings)
      }));
      
      mongoose.model('Movie').findById.mockResolvedValue({
        _id: '1',
        title: 'Test Movie'
      });
      
      const res = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', 'Bearer token');
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});