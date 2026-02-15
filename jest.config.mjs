export default {
    testEnvironment: 'node',
    testMatch: ['**/tests/jest/**/*.test.mjs'],
    collectCoverageFrom: [
        'mcp-x402/helpers/**/*.mjs',
        '!mcp-x402/flowmcpServers/**'
    ],
    coverageThreshold: {
        global: { branches: 20, functions: 20, lines: 20, statements: 20 }
    },
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    verbose: true,
    testTimeout: 10000
}
