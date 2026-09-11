const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  // Load jest-dom matchers after the test environment is set up
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Use the jsdom environment for React component testing
  testEnvironment: "jest-environment-jsdom",

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
   testMatch: [

    "<rootDir>/**/__tests__/**/*.[jt]s?(x)",],
};

module.exports = createJestConfig(customJestConfig);