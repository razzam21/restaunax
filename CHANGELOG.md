# Changelog

All notable changes to the Restaunax project will be documented in this file.

## [1.1.0] - 2025-05-20

### Added
- Menu item management with predefined items
- Autocomplete component for order form with both menu item selection and custom item entry
- Restaurant-specific order numbering (format: R1-20250520-001)
- Alphabetical sorting of menu items in dropdown for easier discovery
- Auto-fill pricing when selecting menu items
- Comprehensive test coverage for both backend and frontend

### Fixed
- Missing database tables by running proper Prisma migrations
- Menu items not showing in dropdown
- Two separate fields for menu items and custom items were merged into one field with autocomplete
- Validation to properly handle optional menuItemId field

### Changed
- Menu items are now sorted alphabetically in the dropdown
- Updated documentation with complete feature list and technical details
- Enhanced error handling and debugging in order creation process

### Tests
- Added server-side tests verifying restaurant-specific order numbering with >90% coverage
- Added tests for menu item alphabetical sorting
- Added client-side tests for OrderCard to verify order number display
- Updated OrderForm tests for the new Autocomplete component

## [1.0.0] - 2025-05-15

### Added
- Initial release of Restaunax MVP1
- Core order management functionality
- Order listing with status filtering
- Order creation form
- Order detail view
- Status management
- Responsive design for various devices
- Docker containerization for client, server, and database
- Security measures (XSS prevention, SQL injection prevention)
- Comprehensive test coverage