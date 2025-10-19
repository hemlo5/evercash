# EVERCASH - Supabase Google Authentication Setup Guide

This guide will help you set up Google authentication with Supabase for EVERCASH.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Google Cloud Console account (for OAuth credentials)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: evercash (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region to your users
4. Click "Create new project" and wait for setup to complete

## Step 2: Set Up the Database Schema

1. In your Supabase project dashboard, go to the **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase-auth-schema.sql` from this repository
4. Click "Run" to execute the SQL
5. Verify that the tables were created by going to **Table Editor**

## Step 3: Configure Google OAuth

### 3.1 Set up Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

### 3.2 Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the consent screen if prompted:
   - User type: External
   - Fill in app name: **EVERCASH**
   - Add your email as support email
   - Add authorized domains (optional for development)
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: **EVERCASH**
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production URL (when deployed)
   - Authorized redirect URIs:
     - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
     - Find your project ref in Supabase Settings > API
5. Click "Create" and save your **Client ID** and **Client Secret**

### 3.3 Configure Supabase

1. In your Supabase project, go to **Authentication** > **Providers**
2. Find **Google** in the list and click to expand
3. Enable Google provider
4. Enter your **Google Client ID** and **Google Client Secret**
5. Click "Save"

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env` in your project root:
   ```bash
   cp .env.example .env
   ```

2. Fill in the Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
   ```

3. Find these values in Supabase:
   - Go to **Settings** > **API**
   - Copy **Project URL** for `VITE_SUPABASE_URL`
   - Copy **anon public** key for `VITE_SUPABASE_ANON_KEY`

## Step 5: Install Dependencies

```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

## Step 6: Update Your App

The following files have been created/updated for Google authentication:

### New Files:
- `/src/lib/supabase-client.ts` - Supabase client configuration
- `/src/contexts/AuthContext.tsx` - Authentication context
- `/src/components/GoogleAuth.tsx` - Google sign-in component  
- `/src/components/OnboardingModal.tsx` - User onboarding flow
- `/src/pages/AuthCallback.tsx` - OAuth callback handler
- `/supabase-auth-schema.sql` - Database schema

### Files to Update:

#### 1. Update `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GoogleAuth } from '@/components/GoogleAuth';
import { AuthCallback } from '@/pages/AuthCallback';
import OnboardingModal from '@/components/OnboardingModal';
import { useState, useEffect } from 'react';

function ProtectedApp() {
  const { user, profile, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [profile]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  if (!user) {
    return <GoogleAuth />;
  }

  return (
    <>
      <YourMainApp />
      <OnboardingModal 
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={() => {
          // Optionally redirect or refresh data
          window.location.reload();
        }}
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

#### 2. Update `src/main.tsx`:

Add the Toaster component for notifications:

```tsx
import { Toaster } from 'sonner';

// ... other imports

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-center" richColors />
  </React.StrictMode>,
);
```

## Step 7: Test the Authentication Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. You should see the Google Sign-In button

4. Click "Continue with Google" and complete the OAuth flow

5. After successful authentication, you should:
   - Be redirected back to the app
   - See the onboarding modal if this is your first time
   - Complete the 5-step onboarding process
   - Have your data saved to Supabase

## Step 8: Verify Data in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor**
3. Check the `user_profiles` table - you should see your user
4. Check the `onboarding_data` table - you should see your onboarding responses

## Using the Onboarding Data

The onboarding data can be used to:

### 1. Create Initial Budget Categories

```typescript
import { getOnboardingData } from '@/lib/supabase-client';

async function createInitialBudget(userId: string) {
  const onboardingData = await getOnboardingData(userId);
  
  if (!onboardingData) return;
  
  // Create budget categories from expense categories
  for (const category of onboardingData.expense_categories) {
    await api.createCategory({
      name: category.category,
      budgeted_amount: category.amount * 100, // Convert to cents
      // ... other fields
    });
  }
}
```

### 2. Create Initial Savings Goal

```typescript
async function createInitialGoal(userId: string) {
  const onboardingData = await getOnboardingData(userId);
  
  if (!onboardingData) return;
  
  await api.createGoal({
    name: onboardingData.savings_goal || onboardingData.custom_goal,
    target_amount: onboardingData.goal_amount * 100, // Convert to cents
    target_date: calculateTargetDate(), // Based on income and goal
    // ... other fields
  });
}
```

## Troubleshooting

### "Invalid redirect URI" error
- Make sure your redirect URI in Google Cloud Console exactly matches:
  `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`

### "Supabase client not initialized" error
- Verify your `.env` file has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after changing `.env`

### Onboarding modal doesn't show
- Check that the `user_profiles` table has `onboarding_completed = false` for your user
- Check browser console for any errors

### Google button doesn't work
- Verify the Google provider is enabled in Supabase
- Check that you've added your Client ID and Secret correctly
- Check browser console for OAuth errors

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Enable RLS (Row Level Security)** - Already configured in the schema
4. **Regularly rotate secrets** in production
5. **Use HTTPS in production** - Required for OAuth
6. **Limit OAuth scopes** to only what you need

## Next Steps

After setting up authentication:

1. Implement the budget creation logic using onboarding data
2. Create initial goals based on user's savings goal
3. Set up CSV/PDF import if user selected that option
4. Add user profile settings page
5. Implement sign-out functionality

## Support

If you encounter issues:
- Check Supabase logs in your dashboard
- Review the browser console for errors
- Consult Supabase documentation: https://supabase.com/docs
- Check Google OAuth documentation: https://developers.google.com/identity

---

**Ready to go!** Your EVERCASH app now has Google authentication with personalized onboarding! 🎉
