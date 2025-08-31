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