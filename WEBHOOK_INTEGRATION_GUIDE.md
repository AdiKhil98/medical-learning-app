# 🔗 Webhook Integration Guide for Make.com

## 📍 Webhook Endpoint

### Production URL (Vercel) 🔧 **BEING DEPLOYED**
```
https://medical-learning-app.vercel.app/api/webhook-evaluation
```

> **Status**: 🔧 Fixed deployment platform (was incorrectly configured for Netlify)
> **Platform**: Vercel (API functions in `/api` directory)
> **Last Updated**: August 30, 2025  
> **Database**: Connected to Supabase with `evaluation_scores` and `evaluation_sessions` tables

### Alternative URLs (all redirect to the same function)
```
https://medical-learning-app.vercel.app/api/webhook/evaluation
```

### Legacy URLs (Netlify - No longer used)
```
https://medical-learning-app.netlify.app/api/webhook-evaluation (deprecated)
```

### Development URL
```
http://localhost:3000/api/webhook-evaluation (Vercel dev server)
```

## 🚀 Quick Setup for Make.com

### 1. HTTP Module Configuration
- **URL**: `https://medical-learning-app.vercel.app/api/webhook-evaluation`
- **Method**: `POST`
- **Headers**:
  ```
  Content-Type: application/json
  ```

### 2. Request Body (JSON)
```json
{
  "user_id": "{{user_uuid}}",
  "session_id": "{{unique_session_id}}",
  "exam_type": "{{KP_or_FSP}}",
  "conversation_type": "{{patient_or_examiner}}",
  "score": {{numeric_score_0_to_100}},
  "evaluation": "{{evaluation_text}}",
  "timestamp": "{{current_timestamp}}"
}
```

## 📋 Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `user_id` | String (UUID) | User identifier | `"12345678-1234-1234-1234-123456789012"` |
| `session_id` | String | Unique session ID | `"kp_session_001"` |
| `exam_type` | String | Must be "KP" or "FSP" | `"KP"` |
| `conversation_type` | String | Must be "patient" or "examiner" | `"patient"` |
| `score` | Number/String | Score 0-100 (strings like "85/100" work) | `85` |
| `evaluation` | String | Evaluation feedback text | `"Excellent communication..."` |
| `timestamp` | String (optional) | ISO date string | `"2025-08-30T10:00:00.000Z"` |

## ✅ Success Response (200)
```json
{
  "success": true,
  "message": "Evaluation stored successfully",
  "data": {
    "evaluation_id": "uuid-here",
    "user_id": "user-uuid",
    "session_id": "session_001",
    "exam_type": "KP",
    "conversation_type": "patient",
    "score": 85,
    "stored_at": "2025-08-30T10:00:00.000Z",
    "webhook_source": "make.com",
    "deployment": "Netlify"
  },
  "timestamp": "2025-08-30T10:00:00.000Z"
}
```

## ❌ Error Response (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "user_id is required and must be a string",
    "exam_type is required and must be \"KP\" or \"FSP\""
  ],
  "received_data": { ... }
}
```

## 🧪 Testing Your Webhook

### Method 1: Browser Test
Visit: `https://medical-learning-app.netlify.app/api/webhook-evaluation`

### Method 2: Test with curl
```bash
# Test GET (status check)
curl -X GET https://medical-learning-app.netlify.app/api/webhook-evaluation

# Test POST (send evaluation)
curl -X POST https://medical-learning-app.netlify.app/api/webhook-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "12345678-1234-1234-1234-123456789012",
    "session_id": "test_session_001",
    "exam_type": "KP",
    "conversation_type": "patient",
    "score": 85,
    "evaluation": "Test evaluation feedback",
    "timestamp": "2025-08-30T10:00:00.000Z"
  }'
```

## 🔧 Make.com Specific Tips

### Common Make.com Field Mappings
```json
{
  "user_id": "{{1.user_id}}",
  "session_id": "{{1.session_id}}",
  "exam_type": "{{1.exam_type}}",
  "conversation_type": "{{1.conversation_type}}",
  "score": "{{1.score}}",
  "evaluation": "{{1.evaluation}}",
  "timestamp": "{{formatDate(now; \"YYYY-MM-DDTHH:mm:ss.000Z\")}}"
}
```

### Error Handling in Make.com
1. Add error handling to your Make.com scenario
2. Check for `success: false` in response
3. Handle different HTTP status codes:
   - 200: Success
   - 400: Validation error (check required fields)
   - 500: Server error (retry or contact support)

## 🏗️ Database Schema

The webhook stores data in two tables:

### evaluation_scores
- Stores individual evaluation records
- Automatically generates UUID and timestamps
- Links to user via user_id

### evaluation_sessions  
- Stores session summaries
- Updated automatically via database triggers
- Calculates averages and completion status

## 🚨 Troubleshooting

### Common Issues:

1. **"Method not allowed"**
   - Make sure you're using POST method
   - Check that the URL is correct

2. **"Validation failed"**
   - Verify all required fields are present
   - Check field types (especially score as number)
   - Ensure exam_type is exactly "KP" or "FSP"

3. **"CORS error"**
   - This shouldn't happen with the current setup
   - If it does, check your Make.com webhook configuration

4. **"Database error"**
   - Check if user_id exists in the users table
   - Verify Supabase connection is working

### Debug Steps:
1. Test GET endpoint first to verify webhook is accessible
2. Check Make.com execution logs for detailed error messages
3. Check Netlify deployment logs
4. Monitor Netlify function logs for real-time debugging

## 📊 Data Flow

1. **Make.com** sends POST request to webhook
2. **Webhook** validates incoming data
3. **Webhook** stores data in Supabase `evaluation_scores` table
4. **Database trigger** automatically updates `evaluation_sessions` table
5. **App** displays evaluations in user's progress dashboard

## ✅ **WEBHOOK STATUS: FULLY WORKING**

### Recent Updates (August 30, 2025)
- ✅ Security fix: Removed hardcoded credentials
- ✅ Database connection verified with Supabase
- ✅ Full end-to-end testing completed successfully  
- ✅ Evaluation data properly stored in `evaluation_scores` table
- ✅ Session summaries automatically created in `evaluation_sessions` table
- ✅ Proper error handling and validation implemented

### Test Results
```
✅ GET endpoint: Working (returns status and documentation)
✅ POST endpoint: Working (stores data successfully)
✅ Database storage: Working (evaluation_scores table)
✅ Session tracking: Working (evaluation_sessions table) 
✅ Data validation: Working (proper error responses)
✅ CORS headers: Working (Make.com compatible)
```

## 🎯 Next Steps

After successful webhook integration:
1. ✅ **COMPLETED**: Test webhook functionality locally and remotely
2. Test with real Make.com scenarios  
3. Monitor webhook logs in Netlify dashboard
4. Set up alerts for failed webhook calls
5. Consider adding webhook signature verification for additional security

---

📧 **Need Help?** The webhook is fully functional. Check Netlify function logs for debugging or use the test endpoints above.
