/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: "node",

  testMatch: [
    '**/src/test/unit/**/*.test.ts'
  ],
  clearMocks: false, // !! some unit tests fail if this is true

  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1'
  },

  // TypeScript transformation configuration (modern ts-jest syntax)
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // Inherit from tsconfig.json but allow JS files for tests
        allowJs: true,
        esModuleInterop: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        skipLibCheck: true
      }
    }]
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    "/node_modules/",
  ],
};

module.exports = config;
