# User Signup Implementation

## Overview
I've implemented a complete email-based signup system with verification codes for BuildTrack.

## What Was Added

### Backend Changes

1. **User Entity Updates** (`BuildTrack.Domain/Entities/User.cs`)
   - Added `VerificationCode` field
   - Added `VerificationCodeExpiresAt` field
   - Added `IsEmailVerified` field

2. **Email Service** (`BuildTrack.Api/Services/`)
   - `IEmailService.cs` - Interface for email operations
   - `EmailService.cs` - SMTP-based email service with fallback to console logging

3. **Auth Endpoints** (`BuildTrack.Api/Endpoints/AuthEndpoints.cs`)
   - `POST /api/v1/auth/register` - Register new user
   - `POST /api/v1/auth/verify-email` - Verify email with 6-digit code
   - `POST /api/v1/auth/resend-code` - Resend verification code

4. **Configuration** (`appsettings.json`)
   - Added Email section with SMTP settings
   - Registered EmailService in DI container

5. **CORS Update** (`Program.cs`)
   - Added `http://127.0.0.1:5501` to allowed origins

### Frontend Changes

1. **HTML Updates** (`src/web/index.html`)
   - Added signup form with fields: Full Name, Email, Workspace Name, Password
   - Added email verification form with 6-digit code input
   - Added form switching links (Login ↔ Signup)

2. **JavaScript Updates** (`src/web/js/main.js`)
   - Added `setupSignupForm()` - Handles user registration
   - Added `setupVerifyForm()` - Handles email verification
   - Added `setupAuthSwitchLinks()` - Switches between login/signup/verify forms
   - Added state management for auth flow

3. **API Service** (`src/web/js/services/api.js`)
   - Added `register()` function
   - Added `verifyEmail()` function
   - Added `resendVerificationCode()` function

4. **CSS Updates** (`src/web/css/styles.css`)
   - Added `.auth-switch` styles
   - Added `.verification-message` styles
   - Added form helper text styles

## How It Works

### Registration Flow

1. **User fills signup form** → Full Name, Email, Workspace Name, Password
2. **Backend creates user** → Inactive until verified
3. **Backend creates workspace** → User becomes admin of their workspace
4. **Backend generates 6-digit code** → Valid for 15 minutes
5. **Backend sends email** → Code sent to user's email (or logged to console if SMTP not configured)
6. **Frontend shows verification form** → User enters 6-digit code
7. **User verifies email** → Backend validates code
8. **User activated & logged in** → JWT tokens issued, redirected to app

### Email Configuration

The email service supports two modes:

**Development Mode (No SMTP)**
- If SMTP settings are empty, emails are logged to console
- Check server logs to see verification codes during development

**Production Mode (With SMTP)**
- Configure SMTP settings in `appsettings.json`:
  ```json
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": "587",
    "SmtpUser": "your-email@gmail.com",
    "SmtpPassword": "your-app-password",
    "FromEmail": "noreply@buildtrack.com",
    "FromName": "BuildTrack"
  }
  ```

## Next Steps

### 1. Create Database Migration
Run this command to create the migration for new User fields:
```bash
dotnet ef migrations add AddEmailVerification --project src/api/BuildTrack.Infrastructure --startup-project src/api/BuildTrack.Api
```

Then apply the migration:
```bash
dotnet ef database update --project src/api/BuildTrack.Infrastructure --startup-project src/api/BuildTrack.Api
```

### 2. Restart the API Server
The API needs to be restarted for:
- CORS changes to take effect
- Email service to be registered
- New endpoints to be available

### 3. Test the Flow

**Without SMTP (Development):**
1. Open `http://127.0.0.1:5501` in browser
2. Click "Sign up" link
3. Fill in registration form
4. Check API server console logs for verification code
5. Enter the code from logs
6. You should be logged in automatically

**With SMTP (Production):**
1. Configure SMTP settings in `appsettings.json`
2. Restart API server
3. Follow same steps, but code will be sent via email

## Security Features

- Passwords validated by ASP.NET Identity (min 8 chars, uppercase, digit)
- Verification codes expire after 15 minutes
- Users inactive until email verified
- Codes are single-use (cleared after verification)
- Re-registration attempts resend code instead of creating duplicate users

## API Endpoints

### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "fullName": "John Doe",
  "workspaceName": "Acme Corp"
}
```

### Verify Email
```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

### Resend Code
```http
POST /api/v1/auth/resend-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

## Troubleshooting

**Issue: CORS error**
- Ensure API server is restarted after CORS changes
- Check that `http://127.0.0.1:5501` is in the allowed origins

**Issue: Can't see verification code**
- Check API server console logs (development mode)
- Verify SMTP settings if using email

**Issue: Code expired**
- Codes expire after 15 minutes
- Click "Resend" to get a new code

**Issue: Database error**
- Run the migration command to update database schema
- Ensure PostgreSQL is running
