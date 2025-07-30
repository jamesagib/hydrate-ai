# Delete Account Edge Function

This Supabase Edge Function handles the complete deletion of a user account and all associated data.

## What it does

1. **Validates user authentication** - Ensures the request comes from an authenticated user
2. **Deletes all user data** in the correct order (respecting foreign key constraints):
   - Notifications
   - Achievements  
   - Hydration check-ins
   - Hydration plans
   - Streaks
   - Profile
   - User account (from auth.users)

## Deployment

### Prerequisites

Make sure you have the Supabase CLI installed and are logged in:

```bash
npm install -g supabase
supabase login
```

### Deploy the function

From your project root directory:

```bash
supabase functions deploy delete-account
```

### Environment Variables

The function requires these environment variables to be set in your Supabase project:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

You can set these in the Supabase dashboard under Settings > API.

## Security

- The function uses the service role key to perform admin operations
- It validates the user's JWT token before proceeding
- All operations are logged for audit purposes
- CORS headers are properly configured

## Usage

The function is called from the client app when a user confirms account deletion:

```javascript
const { data, error } = await supabase.functions.invoke('delete-account');
```

## Error Handling

The function includes comprehensive error handling:
- Invalid authentication tokens
- Missing environment variables
- Database operation failures
- Proper HTTP status codes and error messages

## Logging

All operations are logged to help with debugging and audit trails:
- User ID being deleted
- Success/failure of each deletion step
- Any errors that occur during the process 