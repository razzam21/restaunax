# Setting Up Authentication for Restaunax

This guide walks you through the steps to set up the authentication system (MVP2) for Restaunax.

## 1. Install Required Packages

First, install the necessary packages for authentication:

```bash
cd server
npm install bcrypt jsonwebtoken cookie-parser express-rate-limit
```

## 2. Create Database Tables

You need to create the database tables for users, refresh tokens, and audit logs. Run the Prisma migration:

```bash
cd server
npx prisma migrate dev --name add_auth_models
```

This will create the following tables in your database:
- `User` - Stores user credentials and role information
- `RefreshToken` - Stores refresh tokens for users
- `AuditLog` - Tracks security events and user actions
- It will also add a `userId` field to the `Order` table

## 3. Seed Test Users

After creating the tables, run the seed script to create test users:

```bash
cd server
npx prisma db seed
```

This will create the following test users:
- Username: "test", Password: "Test1234", Role: "wait_staff"
- Username: "manager", Password: "Test1234", Role: "manager"
- Username: "owner", Password: "Test1234", Role: "owner"

## 4. Configure Environment Variables

Ensure your `.env` file contains the JWT configuration:

```
# JWT Configuration
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
```

Replace `your-access-secret-key` and `your-refresh-secret-key` with secure random strings for production.

## 5. Start the Application

Start the server and client:

```bash
# Start the server
cd server
npm run dev

# In another terminal, start the client
cd client
npm start
```

## 6. Test Authentication

1. Navigate to http://localhost:3000/login
2. Log in with one of the test user credentials
3. You should be redirected to the orders page
4. Try accessing protected routes based on user roles

## Troubleshooting

If you encounter an error like "The table 'public.User' does not exist", make sure you've run the Prisma migration as described in step 2.

If you see "Authentication service unavailable", check your database connection and make sure all required environment variables are set.

## Security Notes

- In production, always use HTTPS
- Set secure passwords for JWT secrets
- Regularly rotate JWT secrets
- Monitor for suspicious login attempts