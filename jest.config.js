const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./apps/web",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/apps/web/$1",
    "^@workspace/ui/(.*)$": "<rootDir>/packages/ui/src/$1",
    "^@workspace/ui$": "<rootDir>/packages/ui/src/index.ts",
    "^@workspace/backend/(.*)$": "<rootDir>/packages/backend/$1",
  },
  testMatch: ["<rootDir>/apps/web/__tests__/**/*.test.{js,jsx,ts,tsx}"],
  collectCoverageFrom: [
    "apps/web/**/*.{js,jsx,ts,tsx}",
    "!apps/web/**/*.d.ts",
    "!apps/web/**/*.stories.{js,jsx,ts,tsx}",
    "!apps/web/.next/**",
    "!apps/web/node_modules/**",
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
