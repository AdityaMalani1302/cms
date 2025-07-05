# 🔐 Google OAuth Integration Setup Guide

This guide will walk you through setting up Google OAuth authentication for the Courier Management System.

## 📋 Prerequisites

- Google account
- Google Cloud Platform access
- CMS application running locally

## 🛠️ Step 1: Google Cloud Console Setup

### 1.1 Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Either select an existing project or click "New Project"
4. If creating new: Enter project name (e.g., "CMS-OAuth") and click "Create"

### 1.2 Enable Required APIs

1. In the Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google+ API" or "People API"
3. Click on it and press **Enable**
4. Also enable "Google OAuth2 API" if available

### 1.3 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **OAuth 2.0 Client IDs**
3. If prompted, configure the OAuth consent screen first:
   - Choose **External** (for testing) or **Internal** (for organization use)
   - Fill in the required fields:
     - App name: `Courier Management System`
     - User support email: Your email
     - Developer contact email: Your email
   - Save and continue through the scopes (no changes needed for basic setup)
   - Add test users if needed (your own email for testing)

4. Back to creating OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: `CMS Web Client`
   
   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```
   
   **Authorized redirect URIs:**
   ```
   http://localhost:5000/api/auth/google/callback
   http://127.0.0.1:5000/api/auth/google/callback
   ```

5. Click **Create**
6. **IMPORTANT:** Copy and save the Client ID and Client Secret

## ⚙️ Step 2: Environment Configuration

### 2.1 Backend Configuration

Create or update `backend/config.env`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

### 2.2 Frontend Configuration

Create or update `frontend/.env`:

```env
# Google OAuth Client ID
REACT_APP_GOOGLE_CLIENT_ID=your_actual_client_id_here

# Backend API URL
REACT_APP_API_URL=http://localhost:5000
```

## 🧪 Step 3: Testing the Integration

### 3.1 Start the Application

```bash
# From the root directory
npm run dev
```

This will start both frontend (port 3000) and backend (port 5000).

### 3.2 Test Login

1. Open your browser and go to `http://localhost:3000`
2. Navigate to **Customer Login** (`http://localhost:3000/customer/login`)
3. You should see a "Continue with Google" button
4. Click it and complete the Google authentication
5. You should be redirected back to the application

### 3.3 Test Registration

1. Navigate to **Customer Registration** (`http://localhost:3000/customer/register`)
2. Click "Continue with Google" 
3. Complete authentication
4. If this is your first time, you'll be prompted to complete your profile

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. "Error 400: redirect_uri_mismatch"
**Solution:** 
- Check that your redirect URIs in Google Console exactly match your backend URL
- Ensure no trailing slashes
- Verify the port numbers match

#### 2. "Error 403: access_blocked"
**Solution:**
- Make sure your app is not in "Testing" mode if you want external users
- Add your email to test users in Google Console
- Verify OAuth consent screen is properly configured

#### 3. Google button not appearing
**Solution:**
- Check that `REACT_APP_GOOGLE_CLIENT_ID` is set in frontend `.env`
- Verify the environment file is in the correct location
- Restart the React development server

#### 4. "Invalid credentials" after Google auth
**Solution:**
- Verify backend environment variables are correct
- Check that the Google Client Secret matches
- Ensure JWT_SECRET is set in backend

#### 5. Profile completion loop
**Solution:**
- After Google registration, users may need to add phone number and address
- This is normal behavior - Google provides name and email only
- Users will be redirected to profile completion page

## 🔒 Security Considerations

### For Production Deployment

1. **Update Authorized Origins:**
   ```
   https://your-domain.com
   https://www.your-domain.com
   ```

2. **Update Redirect URIs:**
   ```
   https://your-api-domain.com/api/auth/google/callback
   ```

3. **Environment Variables:**
   - Use secure environment variable management
   - Never commit actual secrets to version control
   - Use different OAuth apps for development/production

4. **OAuth Consent Screen:**
   - Complete verification process for production
   - Add privacy policy and terms of service URLs
   - Request minimal required scopes

## 📝 Features Included

✅ **One-click registration/login**
✅ **Automatic account linking** (existing email users)
✅ **Profile picture synchronization**
✅ **Secure JWT token handling**
✅ **Profile completion flow**
✅ **Error handling and user feedback**
✅ **Mobile-responsive OAuth buttons**

## 📞 Support

If you encounter issues:

1. Check the browser console for JavaScript errors
2. Check the backend logs for API errors
3. Verify all environment variables are set correctly
4. Ensure Google Cloud project billing is enabled (if required)
5. Test with an incognito browser window to rule out cache issues

## 🎉 Success!

Once configured correctly, users will be able to:
- Register new accounts using their Google credentials
- Sign in to existing accounts via Google
- Have their profile information automatically populated
- Enjoy a seamless authentication experience

The Google OAuth integration provides a secure, user-friendly authentication method that reduces friction for new users while maintaining security standards. 