# Contributing to Passgage MCP Server

Thank you for your interest in contributing to the Passgage MCP Server! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/mcp-server.git
   cd mcp-server
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🛠️ Development Setup

### Prerequisites
- **Node.js** >= 22.0.0
- **npm** >= 8.0.0
- **Passgage API credentials** (for testing)

### Environment Setup
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Add your Passgage API credentials to `.env`

### Build and Test
```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Development mode with hot reload
npm run dev

# Lint code
npm run lint

# Type checking
npm run type-check
```

## 📝 Contribution Guidelines

### Code Style
- Follow existing TypeScript/JavaScript conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Run `npm run lint` before committing

### Commit Messages
Use conventional commit format:
```
feat: add new authentication method
fix: resolve token refresh issue
docs: update installation instructions
test: add unit tests for CRUD operations
```

### Pull Request Process
1. **Update documentation** if you're changing APIs
2. **Add tests** for new functionality
3. **Ensure all tests pass**: `npm test`
4. **Run type checking**: `npm run type-check`
5. **Update CHANGELOG.md** if needed
6. Submit your pull request with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/examples if UI changes

### Adding New Tools
When adding new MCP tools:

1. **Follow naming convention**: `passgage_{operation}_{resource}`
2. **Add proper TypeScript types** in `src/types/api.ts`
3. **Include input validation** using JSON schema
4. **Add permission checks** for authentication modes
5. **Write comprehensive tests**
6. **Update documentation**

Example tool structure:
```typescript
{
  name: 'passgage_get_user',
  description: 'Get user details by ID',
  inputSchema: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        description: 'User ID to retrieve'
      }
    },
    required: ['user_id']
  }
}
```

### Adding New Services
To add support for new Passgage API services:

1. **Add service configuration** in `src/types/api.ts`:
   ```typescript
   'new-service': { 
     companyMode: true, 
     userMode: false, 
     description: 'Service description' 
   }
   ```

2. **Add TypeScript interfaces** for request/response types

3. **Generate CRUD operations** will be automatic

4. **Add specialized tools** if needed in `src/tools/specialized.ts`

5. **Add tests** for the new service

## 🐛 Bug Reports

When reporting bugs, please include:

- **Environment details** (Node.js version, OS, etc.)
- **Clear reproduction steps**
- **Expected vs actual behavior**
- **Error messages and stack traces**
- **Minimal code example** if applicable

Use our bug report template:
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Node.js version:
- Package version:
- Operating System:
```

## 💡 Feature Requests

Feature requests are welcome! Please:

1. **Check existing issues** to avoid duplicates
2. **Provide clear use case** and reasoning
3. **Consider backwards compatibility**
4. **Offer to implement** if possible

## 🔒 Security

**Do not report security vulnerabilities in public issues.**

For security concerns:
- Email: devops@passgage.com
- Include detailed reproduction steps
- Allow reasonable time for response

## 📚 Documentation

Help improve our documentation:

- **README.md** - Installation and usage
- **API documentation** - Tool descriptions
- **Examples** - Real-world usage examples
- **Troubleshooting** - Common issues and solutions

## 🙏 Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Mentioned in release notes
- Added to contributors section

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 📞 Questions?

- Create a GitHub issue for technical questions
- Email: devops@passgage.com for general inquiries
- Check existing documentation and issues first

Thank you for contributing to the Passgage MCP Server! 🎉