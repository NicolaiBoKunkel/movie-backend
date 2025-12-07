module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/Tests'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\.ts$': 'ts-jest',
    '^.+\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\.mjs$))',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        module: 'commonjs'
      }
    }
  },
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
      transform: {
        '^.+\.ts$': 'ts-jest',
        '^.+\.js$': 'babel-jest',
      },
      globals: {
        'ts-jest': {
          tsconfig: {
            module: 'commonjs'
          }
        }
      },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/Tests/Integration_Test/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/Tests/Integration_Test/setup.js'],
      globalTeardown: '<rootDir>/Tests/Integration_Test/teardown.js',
      transform: {
        '^.+\.ts$': 'ts-jest',
        '^.+\.js$': 'babel-jest',
      },
      globals: {
        'ts-jest': {
          tsconfig: {
            module: 'commonjs'
          }
        }
      },
    },
    {
      displayName: 'api',
      testMatch: ['<rootDir>/Tests/Api_Test/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/Tests/Integration_Test/setup.js'],
      globalTeardown: '<rootDir>/Tests/Integration_Test/teardown.js',
      testTimeout: 30000,
      transform: {
        '^.+\.ts$': 'ts-jest',
        '^.+\.js$': 'babel-jest',
      },
      globals: {
        'ts-jest': {
          tsconfig: {
            module: 'commonjs'
          }
        }
      },
    }
  ],
};
