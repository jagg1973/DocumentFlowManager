# Authentication System Guide

## Overview

This application uses SAAS Authentication with email/password credentials.

## Authentication Method

### Email/Password Authentication
- Uses traditional email/password authentication
- Passwords are hashed with bcrypt
- Session-based authentication with secure session management
- Admin access granted to: `jaguzman123@hotmail.com`

## Using the Authentication System

1. **Registration**:
   - Use the registration form to create a new account
   - Provide a valid email address and secure password
   - Your account will be created and you'll be logged in

2. **Login**:
   - Use your registered email and password
   - Admin privileges are automatically granted for the configured admin email

## Admin Access

Admin access is automatically granted to the email `jaguzman123@hotmail.com` during registration or first login.

## Environment Variables

### Required Environment Variables
- `DATABASE_URL`: Database connection string  
- `SESSION_SECRET`: Session encryption key

## Technical Implementation

The system uses SAAS authentication with secure password hashing and session management:

```typescript
// SAAS Authentication with bcrypt password hashing
setupAuth(app);
```

This ensures secure operation with proper password protection and session management.

## Troubleshooting

If you're having login issues:
1. Verify your email and password are correct
2. Check that your account is registered
3. Ensure the database connection is working
4. Check server logs for any authentication errors