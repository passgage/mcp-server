## [1.0.5](https://github.com/passgage/mcp-server/compare/v1.0.4...v1.0.5) (2025-08-31)

### Bug Fixes

* Add workforce management keywords for better NPM discoverability ([3e10af9](https://github.com/passgage/mcp-server/commit/3e10af92d358c839d0f4200a419d30d53b00d33d))

## [1.0.4](https://github.com/passgage/mcp-server/compare/v1.0.3...v1.0.4) (2025-08-31)

### Bug Fixes

* Resolve NPM version conflict for semantic-release ([46c8ec2](https://github.com/passgage/mcp-server/commit/46c8ec2f0a8068111a36d91f2812d33cb44c3a36))
* Temporarily disable MCP Registry publishing ([d11e4cd](https://github.com/passgage/mcp-server/commit/d11e4cd6ae16162f5f848d9c9ab5e22395d19521))

## [1.0.1](https://github.com/passgage/mcp-server/compare/v1.0.0...v1.0.1) (2025-08-31)

### Bug Fixes

* Temporarily disable MCP Registry publishing ([d11e4cd](https://github.com/passgage/mcp-server/commit/d11e4cd6ae16162f5f848d9c9ab5e22395d19521))

## 1.0.0 (2025-08-31)

### Features

* Add comprehensive community infrastructure and MCP Registry automation ([5a1a4fa](https://github.com/passgage/mcp-server/commit/5a1a4fa1ad6b566e66bdf42426e6b04a69b710f2))

### Bug Fixes

* Resolve security vulnerabilities and test failures ([b13fbeb](https://github.com/passgage/mcp-server/commit/b13fbebf194df04e423416ec341d9a0666534a3f))

# Changelog

All notable changes to the Passgage MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Community documentation files (CODE_OF_CONDUCT.md, SECURITY.md, SUPPORT.md)
- GitHub issue templates for bug reports and feature requests
- Pull request template with development checklist
- GitHub Sponsors configuration (FUNDING.yml)
- MIT LICENSE file for open source compliance
- Comprehensive test suite with Jest and TypeScript
- CONTRIBUTING.md with development guidelines
- Logo/favicon for MCP directory submissions
- MCP compatibility badge in README

### Changed
- Updated all contact information to use devops@passgage.com for unified community support

## [1.0.2] - 2024-08-30

### Changed
- Updated repository URLs to official Passgage GitHub organization
- Switched to NPX-based installation as primary method
- Enhanced README with comprehensive NPX usage instructions
- Added personal settings (.claude/settings.local.json) to .gitignore

### Fixed
- Repository metadata in package.json
- NPM badge URL in README
- Clone directory paths in documentation

## [1.0.1] - 2024-08-30

### Added
- Repository metadata for npm publication
- Homepage and bugs URLs in package.json
- .npmignore file to exclude development files
- Binary executable configuration

### Changed
- Enhanced README with detailed installation and usage documentation
- Added Claude Desktop setup guides
- Improved troubleshooting section

## [1.0.0] - 2024-08-30

### Added
- Complete Passgage MCP Server implementation
- 130+ tools covering all Passgage API services
- Dual authentication modes (company API key + user credentials)
- JWT-based user authentication with automatic token refresh
- Permission-aware tool availability system
- Comprehensive CRUD operations for 25+ Passgage services:
  - Users, Approvals, Approval Flows
  - Access Zones, Assignment Requests
  - Branches, Branch Groups, Cards
  - Departments, Devices, Entrances
  - Holidays, Job Positions
  - Leaves, Leave Rules, Leave Types
  - Night Works, Organization Units
  - Shifts, Slacks, Sub Companies
  - User Rates, User Shifts, Working Days
  - Payrolls, User Extra Works, Shift Settings

### Specialized Tools
- File upload with presigned URLs
- Bulk approval operations
- Universal search functionality
- Data export capabilities (CSV, JSON, Excel)
- Dashboard statistics and analytics
- Staff assignment management
- Time tracking and entrance logging

### Features
- Ransack-style advanced filtering with 20+ operators
- Configurable pagination support
- Comprehensive error handling and logging
- TypeScript implementation with full type safety
- Production-ready configuration options
- Debug mode for development
- Request timeout and retry logic
- Environment-based configuration

### Authentication
- Company-level API key authentication
- User-level JWT token authentication
- Automatic token refresh mechanism
- Session management tools
- Authentication mode switching
- Secure credential handling

### Documentation
- Comprehensive README with examples
- Installation guides for multiple platforms
- Claude Desktop integration instructions
- API usage examples and filtering guides
- Troubleshooting documentation
- Configuration templates

### Technical Implementation
- Built with official MCP TypeScript SDK
- ES2022 modules with Node.js 22+ support
- Axios-based HTTP client with interceptors
- Environment variable configuration
- ESLint and TypeScript strict mode
- Production build optimization
