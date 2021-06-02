// Adapted from https://dev.to/maciekgrzybek/setup-next-js-with-typescript-jest-and-react-testing-library-28g5
module.exports = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  setupFiles: ["mock-local-storage"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
}
