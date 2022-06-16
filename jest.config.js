// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextJest = require("next/jest");
const createJestConfig = nextJest({ dir: "./" });
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
module.exports = createJestConfig(customJestConfig);
