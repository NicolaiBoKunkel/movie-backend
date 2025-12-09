# TMDB API Testing Guide

## Quick Start

### Run All TMDB Tests
```bash
# Run both unit and integration tests
npm test -- tmdb-api

# Run only unit tests (fast, no API key needed)
npm run test:unit -- tmdb-api

# Run only integration tests (requires API key)
npm test Tests/Integration_Test/tmdb-api.test.js
```

## Prerequisites

### For Integration Tests
You need a TMDB API key. Get one from: https://www.themoviedb.org/settings/api

Add to your `.env` file:
```env
TMDB_API_KEY=your_api_key_here
```

### For Unit Tests
No prerequisites - these tests are fully mocked and run without external dependencies.

---

## Test Files

### 1. Integration Tests
**Location:** `Tests/Integration_Test/tmdb-api.test.js`

**What it tests:**
- Real API connectivity with TMDB
- Fetching top-rated movies
- Fetching movie details by ID
- Fetching movie credits (cast/crew)
- Fetching movie videos (trailers)
- Error handling (401, 404)
- Rate limiting behavior
- Data validation

**When to run:**
- Before merging to main
- Before deployment
- When API integration changes
- To verify API key works

**Example:**
```bash
npm test Tests/Integration_Test/tmdb-api.test.js
```

### 2. Unit Tests
**Location:** `Tests/Unit_Test/tmdb-api.test.js`

**What it tests:**
- Response parsing logic
- Error handling with mocked responses
- Data transformation
- Edge cases (empty results, null values)
- Network error scenarios
- Malformed JSON handling

**When to run:**
- During development (fast feedback)
- On every commit
- In CI/CD pipelines
- When refactoring code

**Example:**
```bash
npm run test:unit -- tmdb-api
```

---

## Expected Test Results

### Unit Tests (Mocked) - Fast ⚡
```
PASS Tests/Unit_Test/tmdb-api.test.js
  TMDB API Client Unit Tests (Mocked)
    fetchTopRatedMovies
      ✓ should successfully fetch and parse top rated movies (5ms)
      ✓ should handle empty results gracefully (2ms)
      ✓ should handle 401 unauthorized error (3ms)
      ✓ should handle network errors (2ms)
    fetchMovieDetails
      ✓ should successfully fetch movie details (4ms)
      ✓ should handle 404 for non-existent movie (3ms)
      ✓ should validate movie details structure (3ms)
    fetchMovieCredits
      ✓ should successfully fetch movie credits (3ms)
      ✓ should handle missing cast or crew (2ms)
    fetchMovieTrailer
      ✓ should successfully fetch movie videos and find trailer (4ms)
      ✓ should handle no trailers available (2ms)
      ✓ should handle videos with different sites (3ms)
    Error Handling and Edge Cases
      ✓ should handle malformed JSON response (3ms)
      ✓ should handle 500 internal server error (2ms)
      ✓ should handle timeout errors (2ms)
      ✓ should validate pagination parameters (3ms)
    Data Transformation and Validation
      ✓ should validate vote_average is within 0-10 range (3ms)
      ✓ should handle null and undefined values gracefully (2ms)
      ✓ should correctly parse release dates (3ms)

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Time:        0.298s
```

### Integration Tests (Real API) - Slower 🐢
```
PASS Tests/Integration_Test/tmdb-api.test.js
  TMDB External API Integration Tests
    GET /movie/top_rated
      ✓ should fetch top rated movies from TMDB (1245ms)
      ✓ should handle pagination correctly (2103ms)
      ✓ should return error for invalid API key (892ms)
    GET /movie/:id
      ✓ should fetch movie details for valid movie ID (956ms)
      ✓ should return 404 for non-existent movie ID (734ms)
    GET /movie/:id/credits
      ✓ should fetch movie credits (cast and crew) (1102ms)
    GET /movie/:id/videos
      ✓ should fetch movie videos (trailers) (887ms)
      ✓ should find YouTube trailers when available (923ms)
    API Rate Limiting and Error Handling
      ✓ should handle rate limiting gracefully (3421ms)
    Data Validation
      ✓ should validate vote_average is within expected range (1034ms)
      ✓ should validate required fields are present (1189ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Time:        14.486s
```

---

## Troubleshooting

### Integration Tests Skipped
**Problem:** Tests show warning "TMDB_API_KEY not found"

**Solution:**
1. Create a `.env` file in the project root
2. Add your TMDB API key:
   ```env
   TMDB_API_KEY=your_api_key_here
   ```
3. Get an API key from: https://www.themoviedb.org/settings/api

### Integration Tests Fail with 401
**Problem:** Tests fail with "Invalid API key" error

**Solution:**
- Verify your API key is correct in `.env`
- Check if API key is still active on TMDB website
- Ensure there are no extra spaces in the `.env` file

### Integration Tests Timeout
**Problem:** Tests fail with timeout errors

**Solution:**
- Check your internet connection
- Verify TMDB API is not down: https://www.themoviedb.org/
- Tests have 10-15 second timeouts, which should be sufficient

### Rate Limiting Errors
**Problem:** Tests fail with 429 (Too Many Requests)

**Solution:**
- Wait a few minutes before running tests again
- TMDB allows ~40 requests per 10 seconds
- Our tests are designed to respect these limits

### Unit Tests Fail
**Problem:** Mock-related errors in unit tests

**Solution:**
- Ensure Jest is properly installed: `npm install`
- Clear Jest cache: `npx jest --clearCache`
- Verify Jest configuration in `jest.config.js`

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: TMDB API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run unit tests (always)
      run: npm run test:unit -- tmdb-api
    
    - name: Run integration tests (if API key available)
      if: ${{ secrets.TMDB_API_KEY }}
      env:
        TMDB_API_KEY: ${{ secrets.TMDB_API_KEY }}
      run: npm test Tests/Integration_Test/tmdb-api.test.js
```

### Best Practices
1. **Always run unit tests** - fast and reliable
2. **Run integration tests** only if API key is available
3. **Schedule integration tests** separately (nightly builds)
4. **Don't fail builds** if integration tests fail due to external issues

---

## Test Coverage

### What's Covered ✅
- ✅ Fetching top-rated movies
- ✅ Fetching specific movie details
- ✅ Fetching movie credits
- ✅ Fetching movie trailers/videos
- ✅ Pagination handling
- ✅ Error responses (401, 404, 500)
- ✅ Network errors
- ✅ Rate limiting
- ✅ Data validation
- ✅ Response parsing
- ✅ Edge cases (null values, empty results)

### What's NOT Covered ❌
- ❌ TV show endpoints (can be added if needed)
- ❌ Search functionality
- ❌ Image fetching
- ❌ Authentication flows (if any)

---

## Exam Preparation

### Key Points to Remember:

1. **Two Testing Strategies:**
   - Integration: Tests actual TMDB API
   - Unit: Mocks responses for fast testing

2. **Rationale:**
   - Integration follows "Don't mock what you don't own"
   - Unit follows "London school" - isolate dependencies

3. **Trade-offs:**
   - Integration: Slow but validates real integration
   - Unit: Fast but doesn't catch API changes

4. **When to Use:**
   - Unit: During development, every commit
   - Integration: Before merging, before deployment

5. **Justification:**
   - Both approaches provide different types of confidence
   - Complementary strategies give comprehensive coverage
   - Follows test pyramid best practices

### Common Exam Questions:

**Q: "Why test both ways?"**
A: "To get the best of both worlds - fast feedback during development (unit tests) and confidence in real integration (integration tests)."

**Q: "Why mock an external API?"**
A: "We're not mocking TMDB itself - we're mocking fetch (which we own) to test OUR error handling logic, data validation, and response parsing. Integration tests validate the actual TMDB integration."

**Q: "What if TMDB API changes?"**
A: "Integration tests will immediately fail, alerting us. We then update our code and mocks. This dual approach helps us catch and adapt to changes quickly."

---

## Additional Resources

- **Strategy Document:** `Tests/TMDB_API_TESTING_STRATEGY.md`
- **TMDB API Docs:** https://developers.themoviedb.org/3
- **Jest Documentation:** https://jestjs.io/
- **Testing Best Practices:** Martin Fowler's "Mocks Aren't Stubs"

---

## Maintenance

### When to Update Tests:

1. **When TMDB API changes:**
   - Update integration tests first
   - Verify they pass with new API
   - Update unit test mocks to match new structure

2. **When adding new features:**
   - Add both unit and integration tests
   - Follow the same pattern as existing tests

3. **When refactoring:**
   - Unit tests should still pass (test behavior, not implementation)
   - Integration tests validate external contract remains valid

---

## Support

If you encounter issues:
1. Check this README first
2. Review the strategy document: `TMDB_API_TESTING_STRATEGY.md`
3. Verify your `.env` configuration
4. Check TMDB API status
5. Review Jest configuration

---

**Happy Testing! 🎬🍿**
