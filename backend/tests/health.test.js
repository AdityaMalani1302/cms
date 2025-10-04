const request = require('supertest');

// Simple health check test to validate the test setup
describe('Test Setup Validation', () => {
  test('should be able to run tests', () => {
    expect(1 + 1).toBe(2);
  });

  test('environment should be set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});