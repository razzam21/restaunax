Restaunax Real-time Order Management Dashboard PRD
1. Product Overview
Product Name: Restaunax Order Management DashboardPurpose: To enable wait staff to create and update customer orders and allow managers/owners to monitor order status in real-time, improving restaurant operational efficiency.Objective: Deliver a series of minimum viable products (MVPs) for a secure, scalable, and responsive order management system, developed using Test-Driven Development (TDD) with robust protections against XSS, SQL injection, and proper CORS configuration. Authentication and authorization will follow industry best practices (e.g., OWASP guidelines). The system will run in Docker containers, use PostgreSQL with Prisma and Phinx migrations, and support dynamic theming.
2. Target Audience

Primary Users: Wait staff (creating and updating orders).  
Secondary Users: Managers and owners (monitoring order status).  
Scope: Single restaurant instance tied to the logged-in user's account. Reporting features are part of MVP 4.

3. MVP Prioritization

MVP 1: Order System – Core functionality for creating, viewing, and updating orders.  
MVP 2: Login System – Authentication and role-based authorization with best practices.  
MVP 3: Theming – Dynamic color theming based on user's restaurant.  
MVP 4: Enhanced Management Dashboard & Reports
MVP 5: Menu Management – Ability for managers and owners to manage menu items.

4. Development Methodology

Test-Driven Development (TDD):  
Write unit and integration tests before implementation using Jest for backend (API routes, services) and frontend (React components).  
Ensure >80% test coverage for critical paths (e.g., order CRUD, authentication, authorization, security validations).  
Tests include security scenarios for XSS, SQL injection, CORS, and authentication/authorization edge cases.  
Run tests automatically via CI (e.g., GitHub Actions) in Docker environment.



5. Security Requirements

XSS (Cross-Site Scripting) Prevention:  
Backend: Sanitize all user inputs (e.g., customerName, item names) using sanitize-html or DOMPurify.  
Frontend: Use React's built-in escaping; avoid dangerouslySetInnerHTML unless sanitized.  
TDD: Tests for sanitization, ensuring malicious scripts (e.g., <script>alert('xss')</script>) are neutralized.


SQL Injection Prevention:  
Use Prisma ORM with parameterized queries.  
Validate and sanitize inputs before database operations.  
TDD: Tests for invalid inputs (e.g., SQL injection attempts like '; DROP TABLE orders; --).


CORS (Cross-Origin Resource Sharing):  
Configure Express CORS middleware to allow requests only from the frontend's origin (e.g., http://localhost:80 in development, specific domain in production).  
Restrict methods (GET, POST, PATCH) and headers.  
TDD: Tests for CORS policy enforcement, rejecting unauthorized origins.


Authentication and Authorization Best Practices (MVP 2):  
Authentication:  
Use JSON Web Tokens (JWT) with strong secrets (256-bit, environment variable).  
Implement secure password storage with bcrypt (minimum 12 rounds).  
Enforce strong password policies (8+ characters, mixed case, numbers).  
Use short-lived access tokens (15-minute expiry) with refresh tokens (7-day expiry).  
Store refresh tokens in HTTP-only, Secure, SameSite=Strict cookies.  
Implement rate limiting on login/register endpoints (5 attempts/min/IP).  
Use HTTPS for all API communications.


Authorization:  
Implement Role-Based Access Control (RBAC) with roles: wait_staff, manager, owner.  
Enforce least privilege (e.g., wait_staff can only create/update orders).  
Validate roles and permissions server-side in middleware.  
Audit user actions (e.g., log order updates with user ID, timestamp).


TDD: Tests for token validation, role enforcement, brute-force protection, secure cookie handling.



6. Key Features and Requirements
6.1 MVP 1: Order System
Objective: Enable wait staff to create and update orders and managers/owners to view orders by status, with a secure backend and responsive UI.Components: Backend API, frontend dashboard, PostgreSQL database, Phinx migrations, Docker deployment.
Backend (Node.js/Express, Prisma, PostgreSQL)



Feature
Description
Details



GET /orders
List all orders for the restaurant
- Returns orders for the restaurant (hardcoded restaurantId in MVP 1).- Query parameter: status (optional; pending, preparing, ready, delivered).- Response: JSON array of order objects.- Security: Sanitize status parameter; CORS restricted to frontend origin; HTTPS required.- TDD: Tests for filtering, empty results, invalid status, XSS attempts, CORS rejection, SQL injection.


GET /orders/:id
Retrieve specific order
- Returns single order by ID.- Response: JSON order object.- Returns 404 if not found.- Security: Sanitize id; CORS restricted; HTTPS.- TDD: Tests for valid/invalid IDs, 404 handling, XSS in response.


PATCH /orders/:id
Update order status
- Updates status (allowed: pending → preparing → ready → delivered).- Validates transitions.- Returns updated order or 400 for invalid status.- Security: Sanitize status; CORS restricted; HTTPS.- TDD: Tests for valid/invalid transitions, error responses, SQL injection attempts.


POST /orders
Create new order
- Creates order via UI.- Accepts JSON payload with order fields.- Returns created order (201 status).- Security: Sanitize customerName, items; validate orderType, status; CORS restricted; HTTPS.- TDD: Tests for valid/invalid payloads, sanitization, XSS/SQL injection prevention.


Frontend (React, Material UI)



Feature
Description
Details



Order Dashboard
Display orders by status
- Tabs/sections for pending, preparing, ready, delivered.- Shows: ID, customer name, order type, total, created time.- Polls every 30 seconds.- Security: Escape user inputs (e.g., customerName) in rendering.- TDD: Tests for component rendering, API integration, XSS-safe display.


Order Details View
Show full order details
- Displays all order fields, including items.- Dropdown/button to update status (PATCH).- Security: Escape item names, customerName.- TDD: Tests for data display, status update flow, XSS prevention.


Order Creation Form
Create new orders
- Form for customer name, order type, items (add/remove dynamically).- Submits to POST /orders.- Validates input (e.g., non-empty fields).- Security: Client-side validation; escape inputs before display.- TDD: Tests for form validation, submission, XSS handling.


Responsive Design
Support multiple devices
- Material UI grid for desktops (1920x1080), tablets (1024x768), phones (375x667).- Touch-friendly buttons.- Security: No impact on XSS/SQL; CORS not applicable.- TDD: Tests for responsive rendering (e.g., via Testing Library).


Data Storage (PostgreSQL, Prisma, Phinx)



Feature
Description
Details



PostgreSQL
Persistent storage
- Stores orders.- Prisma ORM with parameterized queries.- Runs in Docker container.- Security: Parameterized queries prevent SQL injection.- TDD: Tests for CRUD operations, injection prevention.


Phinx Migrations
Schema management
- Migrations for orders, order_items tables.- Command: phinx migrate.- Security: No user input in migrations.- TDD: Tests for migration integrity.


Seed Script
Generate 10-15 mock orders
- Creates orders with varied statuses/types.- Uses Phinx seeders (phinx seed:run).- Security: Sanitize seed data.- TDD: Tests for seed data consistency, XSS-safe data.


Order Schema
{
  "id": "string", // UUID
  "restaurantId": "string", // UUID (hardcoded for MVP 1)
  "customerName": "string", // e.g., "Alex Johnson"
  "orderType": "string", // Enum: ["delivery", "pickup"]
  "items": [
    {
      "id": "string", // UUID
      "name": "string", // e.g., "Margherita Pizza"
      "quantity": "number", // e.g., 2
      "price": "number" // e.g., 15.99
    }
  ],
  "status": "string", // Enum: ["pending", "preparing", "ready", "delivered"]
  "total": "number", // e.g., 42.50
  "createdAt": "string" // ISO 8601, e.g., "2024-05-07T18:30:00Z"
}

Sample Seed Order
{
  "id": "ord_123456",
  "restaurantId": "rest_1",
  "customerName": "Alex Johnson",
  "orderType": "delivery",
  "status": "pending",
  "total": 42.5,
  "createdAt": "2024-05-07T18:30:00Z",
  "items": [
    {
      "id": "item_1",
      "name": "Margherita Pizza",
      "quantity": 2,
      "price": 15.99
    },
    {
      "id": "item_2",
      "name": "Caesar Salad",
      "quantity": 1,
      "price": 8.99
    }
  ]
}

Assumptions for MVP 1:

No authentication (restaurantId hardcoded; secured in MVP 2).  
Security: XSS sanitized with sanitize-html; SQL injection prevented via Prisma; CORS allows frontend origin only (http://localhost:80); HTTPS enforced.

6.2 MVP 2: Login System
Objective: Implement secure authentication and role-based authorization following best practices, with protections against XSS, SQL injection, and proper CORS handling.Components: Authentication endpoints, role-based access, user management.
Backend



Feature
Description
Details



POST /login
Authenticate users
- Accepts username/password.- Returns JWT access token (15-min expiry) and refresh token (7-day expiry).- Security: Sanitize username with sanitize-html; hash passwords with bcrypt (12 rounds); rate limit to 5 attempts/min/IP (e.g., using express-rate-limit); refresh token in HTTP-only, Secure, SameSite=Strict cookie; CORS restricted; HTTPS required.- TDD: Tests for valid/invalid credentials, token generation, rate limiting, XSS/SQL injection, cookie security.


POST /refresh-token
Refresh access token
- Accepts refresh token from cookie.- Returns new access token.- Security: Validate refresh token; revoke on mismatch; CORS restricted; HTTPS.- TDD: Tests for token refresh, invalid/expired tokens, security headers.


POST /register
Create users (setup)
- Creates user with username, password, role, restaurantId.- Enforces strong password policy (8+ chars, mixed case, numbers).- Security: Sanitize username, role; hash password with bcrypt; rate limit; CORS restricted; HTTPS.- TDD: Tests for user creation, duplicate usernames, password policy, injection attempts.


Authorization Middleware
Role-based access
- Roles: wait_staff (create/update orders), manager (view/update orders), owner (view all orders).- Middleware validates JWT and role.- Logs actions (e.g., order updates with user ID, timestamp) in audit_logs table.- Security: Validate JWT signature, expiry; enforce least privilege; CORS restricted; HTTPS.- TDD: Tests for role restrictions, 401/403 errors, XSS in payloads, audit logging.


Frontend



Feature
Description
Details



Login Page
User authentication
- Form for username/password.- Submits to POST /login.- Stores access token in memory (or localStorage for MVP; cookies in production).- Security: Escape form inputs; display sanitized error messages.- TDD: Tests for form validation, login flow, XSS handling.


Secured Dashboard
Restrict access
- Requires valid JWT.- Redirects to login if unauthorized.- Security: Escape displayed user data (e.g., username).- TDD: Tests for protected routes, XSS-safe rendering.


Data Storage



Feature
Description
Details



User Schema
Store user data
- Table: users (id, restaurantId, username, password, role).- Phinx migration for users, audit_logs tables.- Security: Parameterized queries; hashed passwords.- TDD: Tests for user CRUD, injection prevention.


User Schema
{
  "id": "string", // UUID
  "restaurantId": "string", // UUID
  "username": "string",
  "password": "string", // Hashed (bcrypt)
  "role": "string" // Enum: ["wait_staff", "manager", "owner"]
}

Audit Log Schema
{
  "id": "string", // UUID
  "userId": "string", // UUID
  "action": "string", // e.g., "update_order", "login"
  "timestamp": "string", // ISO 8601
  "details": "object" // e.g., { orderId: "ord_123", newStatus: "preparing" }
}

Assumptions:

Orders tied to user's restaurantId.  
Role-based UI deferred to future iterations.  
Refresh tokens stored in database for revocation.  
Security: XSS sanitized; SQL injection prevented; CORS restricted; HTTPS enforced.

6.3 MVP 3: Theming
Objective: Implement dynamic theming based on user's restaurant, using provided color scheme.Components: Frontend theme system integrated with Material UI.



Feature
Description
Details



Dynamic Theming
Apply theme based on restaurantId
- Themes in /src/themes (e.g., default.js, <restaurantId>.js).- Default theme uses provided colors:   - Primary: Slightly Dark Blue (#2C4A7A)   - Secondary: Slightly Dark Orange (#D97A3A)   - Background: Off-White (#F9FAFB), Light Gray (#E5E7EB)   - Accents: Muted Teal (#4A8B8C), Deep Red (#A8333B).- Theme applied on login based on restaurantId.- Security: Sanitize theme data if user-provided (future-proofing).- TDD: Tests for theme loading, color application, XSS in theme files.


Theme Switching
Support multiple themes
- Themes stored as JSON/CSS in /src/themes.- Material UI ThemeProvider applies theme.- Security: Validate theme data structure.- TDD: Tests for theme switching, fallback to default.


Sample Theme (referenced from prior artifact, ID retained):  

File: default.js (artifact_id: 880c381e-166b-4243-9bb9-0d779ed1c042)  
Content: Material UI theme with provided colors.

Assumptions:

Theme applied post-login based on restaurantId.  
Security: Theme files are static; no user input in MVP 3.

6.4 MVP 4: Enhanced Management Dashboard & Reports
Objective: Enable managers/owners to monitor restaurant operations in real-time and access detailed business reports.
Components: Real-time dashboard with WebSockets, business analytics, and downloadable reports.

Feature | Description | Details
--- | --- | ---
**Backend** |  |  
GET /reports/orders | Generate order report | - Returns aggregated data (e.g., orders by status, total revenue by day).<br>- Query parameters: startDate, endDate.<br>- Response: JSON with summary data.<br>- Security: Sanitize query parameters; CORS restricted; HTTPS; owner/manager-only.<br>- TDD: Tests for aggregation, date filtering, XSS/SQL injection.
GET /reports/orders/download | Download report | - Returns report file in specified format (CSV or PDF).<br>- Query parameters: format, startDate, endDate.<br>- Security: Sanitize report data; CORS restricted; HTTPS; owner/manager-only.<br>- TDD: Tests for format options, data accuracy, security.
GET /dashboard/metrics | Get real-time metrics | - Returns key business metrics for dashboard.<br>- Data includes: current day's revenue, average order value, order volume by hour, busiest periods.<br>- Security: CORS restricted; HTTPS; owner/manager-only.<br>- TDD: Tests for metric calculations, data accuracy.
WebSocket /ws/dashboard | Real-time updates | - Establishes WebSocket connection for live dashboard updates.<br>- Pushes events for new orders, status changes, revenue updates.<br>- Security: JWT authentication; owner/manager-only access.<br>- TDD: Tests for connection, event emission, authorization.
**Frontend** |  |  
Management Dashboard | Business overview | - Displays real-time KPIs: daily revenue, order volume, average preparation time, average order value.<br>- Shows active tables/orders, staff productivity metrics.<br>- Includes trend graphs: hourly revenue, order volume by time.<br>- Security: Escape displayed data.<br>- TDD: Tests for dashboard rendering, WebSocket integration, XSS handling.
Menu Performance | Item analytics | - Visualizes most/least popular items.<br>- Shows item profitability, preparation time efficiency.<br>- Security: Escape item data.<br>- TDD: Tests for visualization rendering, data accuracy.
Operational Health | Staff & kitchen metrics | - Shows kitchen load/capacity.<br>- Displays order backlog and preparation bottlenecks.<br>- Highlights abnormal order preparation times.<br>- Security: Escape displayed data.<br>- TDD: Tests for metric calculations, visualization rendering.
Reports Page | View reports | - Displays summary (e.g., orders by status, revenue).<br>- Uses Chart.js for visualizations (bar/pie charts).<br>- Date range picker for filtering.<br>- Security: Escape displayed data.<br>- TDD: Tests for chart rendering, filter application, XSS handling.
Download Options | Export reports | - Buttons to export reports in CSV or PDF formats.<br>- Options for different report types (daily, weekly, monthly).<br>- Security: Sanitize file content.<br>- TDD: Tests for download functionality, format options, XSS prevention.

**Data Structure**:

Dashboard Metrics Schema
```json
{
  "dailyRevenue": {
    "today": "number", // e.g., 1250.75
    "previous": "number", // e.g., 1124.50
    "percentChange": "number" // e.g., 11.2
  },
  "orderMetrics": {
    "totalToday": "number", // e.g., 42
    "averageValue": "number", // e.g., 29.78
    "averagePrepTime": "number" // e.g., 18.5 (minutes)
  },
  "hourlyData": [
    {
      "hour": "string", // e.g., "10:00"
      "revenue": "number", // e.g., 325.50
      "orderCount": "number" // e.g., 12
    }
  ],
  "itemPerformance": [
    {
      "itemName": "string", // e.g., "Margherita Pizza"
      "quantity": "number", // e.g., 28
      "revenue": "number", // e.g., 447.72
      "averagePrepTime": "number" // e.g., 12.5 (minutes)
    }
  ],
  "operationalStatus": {
    "kitchenLoad": "number", // e.g., 75 (percent)
    "pendingOrders": "number", // e.g., 8
    "staffProductivity": "number", // e.g., 5.2 (orders per hour)
    "peakHours": ["string"] // e.g., ["12:00", "19:00"]
  }
}
```

WebSocket Message Schema
```json
{
  "type": "string", // e.g., "new_order", "status_update", "revenue_update"
  "timestamp": "string", // ISO 8601
  "data": "object" // Event-specific data
}
```

**Assumptions**:
- Dashboard view limited to manager and owner roles
- Reports can be downloaded in CSV or PDF format
- WebSockets used for real-time updates
- Security: Role-based access (manager/owner); XSS sanitized; CORS restricted; WebSocket authentication

6.5 MVP 5: Menu Management
Objective: Enable managers and owners to create, update, and manage menu items with categorization, pricing, and availability controls.
Components: Backend API for menu management, frontend management interface, menu database schema.

Feature | Description | Details
--- | --- | ---
**Backend** |  |  
GET /menu | List menu items | - Returns all menu items for the restaurant.<br>- Query parameters: category, status (active/inactive).<br>- Response: JSON array of menu items.<br>- Security: CORS restricted; HTTPS; manager/owner-only.<br>- TDD: Tests for filtering, pagination, XSS prevention.
GET /menu/:id | Get menu item | - Returns single menu item by ID.<br>- Response: JSON menu item object.<br>- Returns 404 if not found.<br>- Security: Sanitize id; CORS restricted; HTTPS.<br>- TDD: Tests for valid/invalid IDs, 404 handling.
POST /menu | Create menu item | - Creates new menu item.<br>- Accepts JSON payload with item fields.<br>- Returns created item (201 status).<br>- Security: Sanitize inputs; validate price, category; CORS restricted; HTTPS; manager/owner-only.<br>- TDD: Tests for valid/invalid payloads, sanitization, authorization.
PATCH /menu/:id | Update menu item | - Updates existing menu item.<br>- Accepts JSON payload with fields to update.<br>- Returns updated item.<br>- Security: Sanitize inputs; validate fields; CORS restricted; HTTPS; manager/owner-only.<br>- TDD: Tests for valid/invalid updates, authorization.
DELETE /menu/:id | Delete menu item | - Soft deletes menu item (marks as inactive).<br>- Returns 204 No Content.<br>- Security: Validate id; CORS restricted; HTTPS; owner-only.<br>- TDD: Tests for successful deletion, authorization, validation.
GET /menu/categories | List categories | - Returns all menu categories.<br>- Response: JSON array of categories.<br>- Security: CORS restricted; HTTPS; manager/owner-only.<br>- TDD: Tests for successful retrieval, authorization.
POST /menu/categories | Create category | - Creates new menu category.<br>- Accepts JSON payload with category name and description.<br>- Returns created category (201 status).<br>- Security: Sanitize inputs; CORS restricted; HTTPS; owner-only.<br>- TDD: Tests for valid/invalid payloads, authorization.
**Frontend** |  |  
Menu Management Page | Main interface | - Accessible via top navigation bar for managers/owners only.<br>- Displays menu items in a table with filtering/sorting.<br>- Shows item status (active/inactive) with visual indicators.<br>- Includes quick action buttons (edit, deactivate).<br>- Security: Escape displayed data; role-based access.<br>- TDD: Tests for rendering, authorization, user interactions.
Menu Item Form | Create/edit items | - Form for item name, description, price, category, image, dietary info.<br>- File upload for item images with preview.<br>- Validation for required fields and price format.<br>- Security: Input validation; sanitization; restrict image file types/size.<br>- TDD: Tests for form validation, file upload, XSS prevention.
Category Management | Organize menu | - Interface to create/edit categories.<br>- Drag-and-drop reordering of categories.<br>- Security: Input validation; sanitization.<br>- TDD: Tests for category operations, ordering persistence.
Menu Preview | View menu | - Shows how menu will appear to customers (future integration).<br>- Filters by category.<br>- Security: Escape displayed data.<br>- TDD: Tests for preview rendering, filtering.
Bulk Actions | Mass updates | - Enable/disable multiple items.<br>- Change category for multiple items.<br>- Security: Authorization checks; validation.<br>- TDD: Tests for bulk operations, validation.

**Data Structure**:

Menu Item Schema
```json
{
  "id": "string", // UUID
  "restaurantId": "string", // UUID
  "name": "string", // e.g., "Margherita Pizza"
  "description": "string", // e.g., "Fresh mozzarella, tomatoes, and basil"
  "price": "number", // e.g., 12.99
  "category": "string", // e.g., "Pizza"
  "categoryId": "string", // UUID
  "image": "string", // URL to image
  "dietaryInfo": {
    "vegetarian": "boolean",
    "vegan": "boolean",
    "glutenFree": "boolean",
    "containsNuts": "boolean",
    "spicyLevel": "number" // 0-3
  },
  "isActive": "boolean", // true/false
  "preparationTime": "number", // in minutes, e.g., 15
  "createdAt": "string", // ISO 8601
  "updatedAt": "string", // ISO 8601
  "createdBy": "string", // User ID
  "updatedBy": "string" // User ID
}
```

Menu Category Schema
```json
{
  "id": "string", // UUID
  "restaurantId": "string", // UUID
  "name": "string", // e.g., "Pizza"
  "description": "string", // e.g., "Our signature wood-fired pizzas"
  "displayOrder": "number", // e.g., 1 (for sorting)
  "isActive": "boolean", // true/false
  "createdAt": "string", // ISO 8601
  "updatedAt": "string" // ISO 8601
}
```

**Assumptions**:
- Menu management restricted to manager and owner roles
- Images stored with size/type restrictions, linked by URL in database
- Soft deletion preferred over hard deletion (items marked inactive)
- Menu categories created by owners, can be used by managers
- Security: Role-based access control; input sanitization; CORS restricted; HTTPS enforcement

7. Non-Functional Requirements

Performance: API response time < 200ms for GET, < 500ms for POST/PATCH (100 concurrent users).  
Scalability: Handle 1,000 orders/day per restaurant.  
Security:  
MVP 1: Input sanitization (XSS), Prisma parameterized queries (SQL injection), CORS restricted, HTTPS.  
MVP 2: JWT with short-lived tokens, refresh tokens in HTTP-only cookies, bcrypt passwords, rate limiting, RBAC, audit logging, CORS, HTTPS.  
MVP 3-4: Maintain XSS, SQL injection, CORS, HTTPS protections.


Reliability: 99% backend uptime; UI handles errors gracefully (Material UI Snackbar).  
Maintainability:  
TDD with Jest (>80% coverage).  
ESLint/Prettier for code quality.  
Modular structure (routes, services, components).  
Phinx migrations for database versioning.


Responsive Design: Supports desktops (1920x1080), tablets (1024x768), phones (375x667).

8. Technical Stack

Backend: Node.js, Express, Prisma, PostgreSQL, Phinx, JWT, bcrypt, sanitize-html, express-rate-limit, Jest, Socket.io, multer (file upload), sharp (image processing).  
Frontend: React, Material UI, Axios, React Router, Chart.js (MVP 4), React Dropzone (file upload), React Beautiful DND (drag-and-drop), Jest.  
Deployment: Docker, Docker Compose.  
Development Tools: ESLint, Prettier, GitHub Actions (CI for tests).

9. Deployment (Docker)

Containers: Frontend (React), backend (Node.js/Express), database (PostgreSQL).  
Docker Compose: Orchestrates services, ports, volumes, environment variables.  
Security: Backend container uses HTTPS (self-signed cert in dev, proper cert in prod).  
TDD: Tests for container startup, service communication, CORS enforcement.

Sample Docker Compose (referenced from prior artifact, ID retained):  

File: docker-compose.yml (artifact_id: f5c4f75b-a374-47aa-b68c-bddf77f806e5)  
Content: Defines services for frontend, backend, and database.

10. Deliverables

MVP 1: Order system (API, dashboard, order creation/update, seeding).  
MVP 2: Login system (auth endpoints, RBAC, user management, audit logging).  
MVP 3: Dynamic theming (theme files, Material UI integration).  
MVP 4: Enhanced Management Dashboard & Reports (API, UI, WebSockets, business analytics, downloadable reports).  
MVP 5: Menu Management (API, menu CRUD, category management, UI for managers/owners).
General:  
OpenAPI/Postman API documentation.  
Phinx migrations and seeders.  
Jest test suite (>80% coverage, including XSS, SQL injection, CORS, auth tests).  
README with setup, run, migration, test, and seed instructions.  
Docker Compose file for local deployment.



11. Success Metrics

MVP 1: Wait staff can create/update orders; managers/owners can view orders; tests pass; XSS/SQL injection prevented; CORS enforced.  
MVP 2: Users can log in; roles restrict access correctly; secure tokens/cookies; tests pass.  
MVP 3: Theme applies based on restaurantId; UI responsive; tests pass.  
MVP 4: 
  - Management dashboard displays real-time business metrics
  - WebSocket connections provide instant updates on orders and revenue
  - KPIs show relevant business health information
  - Reports display/download correctly in both CSV and PDF formats
  - Charts render and update in real-time
  - Security tests pass for WebSocket authentication and authorization
  - All functionality restricted to manager/owner roles
MVP 5:
  - Managers/owners can create, update, and manage menu items
  - Menu items can be categorized and have pricing/availability controls
  - Menu management interface accessible via top navigation
  - Image upload for menu items works correctly
  - Role-based access prevents unauthorized users from accessing menu management
  - Changes to menu items reflect in order creation immediately

General:  
Order creation/update takes < 10 seconds.  
No critical ESLint errors; modular code.  
App runs with docker-compose up without errors.  
Security tests pass (XSS, SQL injection, CORS, auth).



12. Assumptions and Constraints

Assumptions:  
MVP 1 uses hardcoded restaurantId (secured in MVP 2).  
Polling (30s) for real-time updates; WebSockets in MVP 4.  
Role-based UI deferred to future iterations.  
HTTPS enforced via Docker configuration.


Constraints:  
Limited to Node.js/Express, React/Material UI, PostgreSQL.  
No external integrations in MVPs.  
Development time assumed 1-2 weeks per MVP.



13. Future Considerations

Role-specific UI (e.g., simplified for wait staff).  
Multi-restaurant support.  
Integration with POS/inventory systems.  
Advanced security (e.g., multi-factor authentication, session management).
Mobile application for on-the-go management.
Customer feedback integration.
Inventory management system.
Menu engineering analytics to optimize menu profitability.
Table management and reservation system.
Kitchen display system integration.
Online ordering and delivery integration.