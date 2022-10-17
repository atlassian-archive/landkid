module.exports = {
  projects: [
    {
      preset: 'ts-jest',
      displayName: 'Node tests',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/(auth|bitbucket|db|lib|routes)/**/__tests__/*.test.ts'],
    },
    {
      preset: 'ts-jest',
      displayName: 'UI tests',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: ['**/static/**/__tests__/*.test.{tx,tsx}'],
      moduleNameMapper: {
        '@atlaskit/css-reset': '<rootDir>/src/static/__mocks__/styleMock.js',
      },
    },
  ],
};
