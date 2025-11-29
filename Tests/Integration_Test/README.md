# Integration Tests

This folder contains integration tests for the movie-backend application using Jest.

## Setup

The tests use the following dependencies:
- **Jest**: Testing framework
- **Supertest**: HTTP assertion library for testing Express applications
- **ts-jest**: TypeScript preprocessor for Jest

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- movies.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should return movies"
```

## Test Files

- **movies.test.js**: Tests for movie-related endpoints
- **tv.test.js**: Tests for TV show-related endpoints
- **auth.test.js**: Tests for authentication and authorization
- **health.test.js**: Tests for health check endpoints
- **neo4j.test.js**: Tests for Neo4j graph database endpoints

## Test Structure

Each test file follows this structure:

1. **Setup**: Import dependencies and app
2. **Test Suites**: Grouped by endpoint or feature
3. **Test Cases**: Individual test scenarios
4. **Assertions**: Validate responses and behavior

## Writing New Tests

When adding new tests:

1. Create a new `.test.js` file in this directory
2. Import supertest and your app
3. Group related tests in `describe` blocks
4. Write individual test cases with `test` or `it`
5. Use supertest to make HTTP requests
6. Assert expected behavior with Jest matchers

Example:
```javascript
const request = require('supertest');
const app = require('../../src/app').default;

describe('My Feature Tests', () => {
  test('should do something', async () => {
    const response = await request(app)
      .get('/my-endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

## Environment

- Tests run against the same database configuration as development
- Consider using a separate test database for isolation
- Authentication tokens are generated during test execution
- Neo4j tests gracefully handle connection failures

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up test data after tests complete
3. **Descriptive Names**: Use clear test descriptions
4. **Assertions**: Test both success and error cases
5. **Performance**: Keep tests fast and focused
