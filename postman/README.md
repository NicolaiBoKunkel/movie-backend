# Postman API Testing Suite for Movie Backend

This directory contains a comprehensive Postman collection and environment for testing all endpoints of the Movie Backend API.

## 📁 Files

- **`Movie-Backend-API.postman_collection.json`** - Complete test collection with 50+ test cases
- **`Movie-Backend.postman_environment.json`** - Environment configuration with variables

## 🚀 Getting Started

### 1. Import into Postman

1. Open Postman
2. Click **Import** button (top left)
3. Drag and drop both JSON files or click "Upload Files"
4. Select both files:
   - `Movie-Backend-API.postman_collection.json`
   - `Movie-Backend.postman_environment.json`

### 2. Configure Environment

1. In Postman, select **"Movie Backend Environment"** from the environment dropdown (top right)
2. Update the `BASE_URL` variable if your API runs on a different port:
   - Default: `http://localhost:3000`
   - Click the eye icon next to the environment dropdown to edit

### 3. Run Tests

**Option A: Run Entire Collection**
1. Click on the collection name "Movie Backend API - Complete Test Suite"
2. Click **Run** button
3. Select all requests or specific folders
4. Click **Run Movie Backend API...**

**Option B: Run Individual Tests**
1. Navigate through the folders in the collection
2. Click on any request
3. Click **Send** button

## 📋 Test Collection Structure

### 1. Health Check (1 test)
- ✅ Health check endpoint validation
- Tests: Status code, response time, JSON structure

### 2. Authentication (9 tests)
**Positive Tests:**
- ✅ Register first user (becomes admin automatically)
- ✅ Register regular user
- ✅ Login with admin credentials
- ✅ Login with user credentials

**Negative Tests:**
- ❌ Register with username too short
- ❌ Register with password too short
- ❌ Register with duplicate username
- ❌ Login with wrong password
- ❌ Login with non-existent user

### 3. Movies - Public Endpoints (6 tests)
**Positive Tests:**
- ✅ Get all movies
- ✅ Get movies with limit parameter
- ✅ Get movies with search query
- ✅ Get single movie by ID (with cast, crew, companies)

**Negative Tests:**
- ❌ Get movie with invalid ID format
- ❌ Get non-existent movie

### 4. Movies - Admin Endpoints (11 tests)
**Positive Tests:**
- ✅ Create new movie
- ✅ Update existing movie
- ✅ Delete movie

**Negative Tests:**
- ❌ Create movie without authentication
- ❌ Create movie with user token (non-admin)
- ❌ Create movie with invalid genre IDs
- ❌ Create movie with missing required fields
- ❌ Update movie without authentication
- ❌ Update non-existent movie
- ❌ Delete movie without authentication
- ❌ Delete already deleted movie

### 5. TV Shows - Public Endpoints (3 tests)
**Positive Tests:**
- ✅ Get all TV shows
- ✅ Get single TV show by ID (with seasons, cast, crew)

**Negative Tests:**
- ❌ Get TV show with invalid ID

### 6. TV Shows - Admin Endpoints (4 tests)
**Positive Tests:**
- ✅ Create new TV show
- ✅ Update existing TV show
- ✅ Delete TV show

**Negative Tests:**
- ❌ Create TV show without authentication

### 7. Admin Endpoints (4 tests)
**Positive Tests:**
- ✅ Get audit logs
- ✅ Get audit logs filtered by table
- ✅ Get audit logs filtered by action

**Negative Tests:**
- ❌ Get audit logs with invalid limit parameter

## 🔍 What Each Test Validates

### HTTP Status Codes
- `200` - Successful GET/PUT requests
- `201` - Successful resource creation
- `400` - Bad request (validation errors, invalid IDs)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `409` - Conflict (duplicate username)

### Response Time
- Most tests validate response time is under 200ms-2000ms depending on complexity

### JSON Content
- Validates presence of required fields
- Checks data types (strings, numbers, arrays, booleans)
- Verifies array structures for collections
- Confirms correct values returned

### Business Logic
- First user becomes admin automatically
- Subsequent users have 'user' role
- Admin can create/update/delete resources
- Regular users cannot perform admin operations
- Genre validation works correctly
- Audit logs track all changes

## 🔄 Test Execution Order

**Recommended Order:**
1. **Health Check** - Verify API is running
2. **Authentication** - Create users and obtain tokens
3. **Movies (Public)** - Test read operations
4. **Movies (Admin)** - Test CRUD operations (requires admin token)
5. **TV Shows (Public)** - Test read operations
6. **TV Shows (Admin)** - Test CRUD operations (requires admin token)
7. **Admin** - Test audit log functionality

**Note:** The collection uses environment variables to pass data between tests:
- `ADMIN_TOKEN` - JWT token for admin user
- `USER_TOKEN` - JWT token for regular user
- `TEST_MOVIE_ID` - ID of existing movie for testing
- `CREATED_MOVIE_ID` - ID of newly created movie
- `TEST_TV_ID` - ID of existing TV show
- `CREATED_TV_ID` - ID of newly created TV show

## 📊 Test Coverage Summary

| Category | Total Tests | Positive | Negative |
|----------|-------------|----------|----------|
| Health | 1 | 1 | 0 |
| Authentication | 9 | 4 | 5 |
| Movies (Public) | 6 | 4 | 2 |
| Movies (Admin) | 11 | 3 | 8 |
| TV Shows (Public) | 3 | 2 | 1 |
| TV Shows (Admin) | 4 | 3 | 1 |
| Admin | 4 | 3 | 1 |
| **TOTAL** | **38** | **20** | **18** |

## ⚠️ Important Notes

### Before Running Tests

1. **Start your backend server** - Make sure your API is running on the configured port
2. **Database should be seeded** - Some tests rely on existing data
3. **Run in order** - Authentication tests should run first to generate tokens

### Test Data Cleanup

Some tests create data that should be cleaned up:
- Movies created with `tmdbId: 999888` (and similar test IDs)
- TV shows created with `tmdbId: 888999`
- Test users: `admin_user`, `regular_user`

You may want to:
- Run delete tests after create tests
- Clear test data periodically
- Use a separate test database

### Environment Variables

The following variables are automatically populated during test execution:
- `ADMIN_TOKEN` - Set by "Login - Success (Admin)" test
- `USER_TOKEN` - Set by "Login - Success (Regular User)" test
- `TEST_MOVIE_ID` - Set by "Get All Movies - Success" test
- `CREATED_MOVIE_ID` - Set by "Create Movie - Success" test
- `TEST_TV_ID` - Set by "Get All TV Shows - Success" test
- `CREATED_TV_ID` - Set by "Create TV Show - Success" test

## 🎯 Test Assertions

Each test includes multiple assertions checking:

1. **Status Code** - Correct HTTP status
2. **Response Time** - Performance benchmarks
3. **Content Type** - Proper JSON responses
4. **Response Structure** - Required fields present
5. **Data Types** - Correct types for all fields
6. **Business Rules** - Logic validation
7. **Error Messages** - Appropriate error responses

## 📈 Viewing Test Results

After running tests, Postman provides:
- **Pass/Fail Summary** - Overview of all test results
- **Individual Test Details** - Specific assertion results
- **Response Times** - Performance metrics
- **Response Bodies** - Full API responses
- **Test Scripts** - View assertion code

## 🔧 Customization

### Modify Test Data

Edit request bodies in the collection to use different test data:
- Change movie titles, genres, dates
- Use different usernames and passwords
- Adjust query parameters

### Add New Tests

1. Right-click on a folder
2. Select "Add Request"
3. Configure the request (method, URL, body)
4. Add test scripts in the "Tests" tab

### Adjust Assertions

Click on any request → "Tests" tab to modify assertions:
```javascript
pm.test("Your test name", function () {
    // Your assertion code
});
```

## 📤 Export Results

To export test results for your assignment:
1. Run the collection
2. Click **Export Results** in the runner
3. Choose JSON format
4. Save the results file

## 🤝 Support

If you encounter issues:
1. Check that your BASE_URL is correct
2. Verify the backend server is running
3. Ensure database is properly seeded
4. Check Postman console for detailed errors (View → Show Postman Console)

## 📝 Assignment Deliverables

For your assignment, submit:
1. ✅ `Movie-Backend-API.postman_collection.json` - The collection
2. ✅ `Movie-Backend.postman_environment.json` - The environment
3. 📊 Test results screenshot or exported results JSON
4. 📄 This README explaining the test suite

---

**Total Test Cases: 38**
- ✅ Positive Tests: 20
- ❌ Negative Tests: 18

All endpoints tested with comprehensive validation! 🎉
