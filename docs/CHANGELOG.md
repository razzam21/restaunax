# Changelog

All notable changes to the Restaunax project will be documented in this file.

## [1.3.0] - 2025-05-25

### Added (MVP5: AI-Powered Menu Optimization)
- **Menu Optimization Service**: Comprehensive AI-powered menu analysis and optimization recommendations
- **Menu Performance Analytics**: Item-level and category-level performance metrics with revenue tracking
- **AI-Powered Insights**: Intelligent recommendations for menu improvements and business optimization
- **Real-time Analysis**: Dynamic analysis of 30-90 days of historical order data
- **Interactive Results Viewer**: Rich UI for displaying optimization results with tables, charts, and insights
- **Test-Driven Development**: 100% test coverage with 82 tests across backend and frontend
- **Engine-Agnostic AI**: Support for both OpenAI and Ollama AI engines with transparent switching
- **Data Linkage System**: Enhanced order items with proper menuItemId connections for accurate analysis
- **Business Data Simulation**: Improved simulation script generating 90 days of realistic restaurant data

### Enhanced
- **AI Context**: Extended AIContext to support menu optimization alongside demand forecasting
- **Database Schema**: Enhanced order items with menuItemId foreign key relationships
- **Data Simulation**: Updated simulate-business-data.js with proper menu item linkage and 90-day support
- **Testing Infrastructure**: Comprehensive TDD implementation with Material-UI component testing

### Fixed
- **Menu Item Revenue Tracking**: Resolved $0.00 revenue display by implementing proper data aggregation
- **Duration Tracking**: Fixed 0.0s processing time display by correcting metadata structure
- **Data Quality Indicators**: Enhanced confidence and data quality metrics based on real analysis results
- **Test Coverage**: Achieved 100% test success rate with proper Material-UI testing patterns

## [1.2.0] - 2025-05-21

### Added (MVP3: Dynamic Theming)
- Restaurant-specific theme system with different presets
- Settings page for restaurant owners to customize their restaurant's theme
- Theme preview functionality before saving changes
- Theme selection dropdown with different theme options
- Dynamic color application throughout the application
- Role-based access control for theme settings (owner-only)
- Audit logging system to track theme changes
- Database schema migration for theme support
- Theme context for application-wide theme management

### Fixed
- Audit log creation for restaurant settings updates
- Theme persistence across sessions
- Theme application based on restaurant ID
- Proper error handling and user feedback for theme changes

### Changed
- Updated Prisma schema with theme-related fields (themeId, primaryColor, secondaryColor)
- Enhanced README with theme system documentation
- Added role-based UI elements (settings gear only appears for owners)
- Improved error handling throughout the theme system

### Tests
- Added tests for theme context functionality
- Added tests for settings page access control
- Added tests to verify theme persistence
- Integration tests for theme API endpoints

## [1.1.0] - 2025-05-20 (MVP2: Authentication System)

### Added
- Menu item management with predefined items
- Autocomplete component for order form with both menu item selection and custom item entry
- Restaurant-specific order numbering (format: R1-20250520-001)
- Alphabetical sorting of menu items in dropdown for easier discovery
- Auto-fill pricing when selecting menu items
- Authentication system with JWT tokens
- Role-based access control (wait_staff, manager, owner)
- Secure password storage with bcrypt
- HTTP-only cookies for refresh tokens
- Basic audit logging for authentication events
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
- Added authentication and authorization tests

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