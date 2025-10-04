// Jest setup file
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cmsdb_test';

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}