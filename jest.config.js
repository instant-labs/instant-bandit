// Adapted from https://dev.to/maciekgrzybek/setup-next-js-with-typescript-jest-and-react-testing-library-28g5
module.exports = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  // NOTE: this is only here because of redis issue.
  // See https://github.com/luin/ioredis/issues/1088
  forceExit: true,
}
