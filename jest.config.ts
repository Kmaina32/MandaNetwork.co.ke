import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lucide-react,
  },
  transformIgnorePatterns: ['/node_modules/(?!lucide-react)/'],
};

export default createJestConfig(config);
: '<rootDir>/src/test-mocks/lucide-react.tsx',
  },
  transformIgnorePatterns: ['/node_modules/(?!lucide-react)/'],
};

export default createJestConfig(config);
