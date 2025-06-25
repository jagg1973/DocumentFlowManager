# Authentication System Guide

## Overview

This application supports two authentication methods:

1. **Development Environment**: SAAS Authentication (Email/Password)
2. **Production Environment**: Replit Auth (OAuth)

## Environment-Specific Authentication

### Development (Local/Replit IDE)
- Uses traditional email/password authentication
- Passwords are hashed with bcrypt
- Session-based authentication with PostgreSQL session store
- Admin access granted to: `jaguzman123@hotmail.com`

### Production (Deployed Replit App)
- Uses Replit Auth (OAuth/OpenID Connect)
- Automatic user creation on first login
- Session management through Replit's OAuth system
- Admin access granted to: `jaguzman123@hotmail.com`

## Why Credentials Don't Work Across Environments

The reason your credentials work in development but not in production is that they use completely different authentication systems:

- **Development**: Your password is stored in the database and verified against the hash
- **Production**: Uses Replit's OAuth system - no password verification against database

## Solution for Production Environment

1. **For Replit Auth (Production)**:
   - Access your deployed app
   - Click "Login with Replit" 
   - This will authenticate you through Replit's OAuth system
   - Your account will be automatically created/updated
   - Admin privileges are granted based on email address

2. **For SAAS Auth (Development)**:
   - Use the email/password combination you registered with
   - If you haven't registered, use the registration form first

## Admin Access

Admin access is automatically granted to the email `jaguzman123@hotmail.com` in both environments:
- In development: During registration or first login
- In production: During OAuth flow when user profile is created/updated

## Troubleshooting

### Production Login Issues
1. Ensure you're using the correct deployed URL
2. Clear browser cookies/cache
3. Try incognito/private browsing mode
4. Verify the Replit Auth configuration

### Development Login Issues  
1. Ensure you've registered an account first
2. Verify your email/password combination
3. Check the server logs for authentication errors
4. Reset password if needed using forgot password flow

## Environment Variables Required

### Development
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key

### Production
- `DATABASE_URL`: PostgreSQL connection string  
- `SESSION_SECRET`: Session encryption key
- `REPLIT_DOMAINS`: Allowed redirect domains
- `REPL_ID`: Replit application ID
- `ISSUER_URL`: OpenID Connect issuer (optional, defaults to Replit)

## Technical Implementation

The system automatically detects the environment and loads the appropriate authentication method:

```typescript
if (process.env.NODE_ENV === 'development') {
  // Use SAAS auth in development
  setupAuth(app);
} else {
  // Use Replit Auth in production
  await setupReplitAuth(app);
}
```

This ensures seamless operation across both environments while maintaining security and user experience.