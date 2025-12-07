module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/Tests'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  // Conditional setup based on test type
  setupFilesAfterEnv: process.env.TEST_TYPE === 'unit' ? [] : ['<rootDir>/Tests/Integration_Test/setup.js'],
  globalTeardown: process.env.TEST_TYPE === 'unit' ? undefined : '<rootDir>/Tests/Integration_Test/teardown.js',
  forceExit: true,
  detectOpenHandles: true,
  // Test path patterns for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/Tests/Unit_Test/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: [],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/Tests/Integration_Test/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/Tests/Integration_Test/setup.js'],
      globalTeardown: '<rootDir>/Tests/Integration_Test/teardown.js',
    }
  ],
};
