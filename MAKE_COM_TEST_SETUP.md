# 🧪 Make.com HTTP Module Test Setup

## 📋 Quick Setup Checklist

### Step 1: Create New Scenario
1. Log into Make.com
2. Click "Create a new scenario"
3. Search for "HTTP" and select "HTTP" module
4. Choose "Make a request"

### Step 2: HTTP Module Configuration

#### Basic Settings
```
Method: POST
URL: https://medical-learning-app.netlify.app/api/webhook-evaluation
```

#### Headers
Add these headers exactly:
```
Content-Type: application/json
Accept: application/json
```

#### Request Body (JSON format)
**Option A: Simple Test**
```json
{
  "user_id": "afc76840-d38c-402b-af90-bfead14c6597",
  "session_id": "make_test_001",
  "exam_type": "KP",
  "conversation_type": "patient",
  "score": 92,
  "evaluation": "Excellent patient communication skills demonstrated. Clear explanations provided and empathy shown throughout the consultation.",
  "timestamp": "{{formatDate(now; \"YYYY-MM-DDTHH:mm:ss.000Z\")}}"
}
```

**Option B: Dynamic Test (using Make.com variables)**
```json
{
  "user_id": "afc76840-d38c-402b-af90-bfead14c6597",
  "session_id": "session_{{formatDate(now; \"YYYY_MM_DD_HH_mm_ss\")}}",
  "exam_type": "{{if(contains(\"patient\"; lower(1.conversation_type)); \"KP\"; \"FSP\")}}",
  "conversation_type": "patient",
  "score": {{round(random * 40 + 60)}},
  "evaluation": "{{1.evaluation_text}}",
  "timestamp": "{{formatDate(now; \"YYYY-MM-DDTHH:mm:ss.000Z\")}}"
}
```

#### Advanced Settings
```
Timeout: 40 seconds
Follow redirects: Yes
Reject certificates: No
```

## 🎯 Test Scenarios

### Test 1: Basic Success Test
Use the exact JSON from Option A above. Expected result:
- Status: 200 OK
- Response should include `"success": true`
- Should return an `evaluation_id`

### Test 2: Validation Error Test
```json
{
  "user_id": "invalid-user-id",
  "session_id": "test_validation",
  "exam_type": "INVALID",
  "score": 150,
  "evaluation": ""
}
```
Expected result:
- Status: 400 Bad Request
- Response should include validation errors

### Test 3: Different User Test
```json
{
  "user_id": "cfd7a72f-cac1-4c04-bf04-66a18bc817f9",
  "session_id": "make_test_user2",
  "exam_type": "FSP",
  "conversation_type": "examiner",
  "score": 78,
  "evaluation": "Good understanding of examination procedures. Some areas for improvement in patient interaction.",
  "timestamp": "{{formatDate(now; \"YYYY-MM-DDTHH:mm:ss.000Z\")}}"
}
```

### Test 4: Complete Session Test (Two evaluations)
**First Request (Patient):**
```json
{
  "user_id": "afc76840-d38c-402b-af90-bfead14c6597",
  "session_id": "complete_session_test",
  "exam_type": "KP",
  "conversation_type": "patient",
  "score": 88,
  "evaluation": "Patient interaction was professional and empathetic.",
  "timestamp": "{{formatDate(now; \"YYYY-MM-DDTHH:mm:ss.000Z\")}}"
}
```

**Second Request (Examiner):**
```json
{
  "user_id": "afc76840-d38c-402b-af90-bfead14c6597",
  "session_id": "complete_session_test",
  "exam_type": "KP", 
  "conversation_type": "examiner",
  "score": 85,
  "evaluation": "Examination technique was thorough and systematic.",
  "timestamp": "{{formatDate(now; \"YYYY-MM-DDTHH:mm:ss.000Z\")}}"
}
```

## 📊 Expected Responses

### ✅ Success Response (200)
```json
{
  "success": true,
  "message": "Evaluation stored successfully",
  "data": {
    "evaluation_id": "uuid-here",
    "user_id": "afc76840-d38c-402b-af90-bfead14c6597",
    "session_id": "make_test_001",
    "exam_type": "KP",
    "conversation_type": "patient",
    "score": 92,
    "stored_at": "2025-08-30T22:30:00.000Z",
    "webhook_source": "make.com",
    "deployment": "Netlify"
  },
  "timestamp": "2025-08-30T22:30:00.000Z"
}
```

### ❌ Error Response (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "exam_type is required and must be \"KP\" or \"FSP\"",
    "score must be a number between 0 and 100"
  ],
  "received_data": { ... }
}
```

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### 1. "Method not allowed" Error
- **Cause**: Using GET instead of POST
- **Solution**: Change method to POST in HTTP module

#### 2. "Validation failed" Error  
- **Cause**: Missing or invalid fields
- **Solution**: Check required fields match exactly:
  - `user_id`: Must be valid UUID from users table
  - `exam_type`: Must be exactly "KP" or "FSP" 
  - `conversation_type`: Must be exactly "patient" or "examiner"
  - `score`: Must be number 0-100
  - `evaluation`: Must be non-empty string

#### 3. "Database error: foreign key constraint" 
- **Cause**: Invalid user_id that doesn't exist in users table
- **Solution**: Use one of these valid user IDs:
  - `afc76840-d38c-402b-af90-bfead14c6597` (adi)
  - `cfd7a72f-cac1-4c04-bf04-66a18bc817f9` (adiKK)  
  - `66da816e-844c-4e8a-85af-e7e286124133` (Zaid57)

#### 4. CORS Errors
- **Cause**: Browser blocking cross-origin requests
- **Solution**: This shouldn't happen in Make.com, but if it does:
  - Ensure Content-Type is set to `application/json`
  - Make sure you're using the correct URL

#### 5. Timeout Errors
- **Cause**: Request taking too long
- **Solution**: Increase timeout to 40 seconds in Advanced Settings

## 🧪 Step-by-Step Testing Process

### Phase 1: Basic Test
1. Set up HTTP module with Test 1 configuration
2. Run the scenario
3. Verify you get a 200 response with `success: true`
4. Note the `evaluation_id` in the response

### Phase 2: Error Handling Test  
1. Run Test 2 (validation error)
2. Verify you get a 400 response with error details
3. This confirms error handling is working

### Phase 3: Different Users Test
1. Run Test 3 with a different user
2. Verify data is stored for different users

### Phase 4: Session Completion Test
1. Run both requests from Test 4 with same session_id
2. This tests the session tracking functionality

## 📈 Monitoring & Verification

### Check Stored Data
After successful tests, you can verify data was stored by checking:
1. Supabase dashboard → evaluation_scores table
2. Supabase dashboard → evaluation_sessions table
3. Look for your test session IDs

### Make.com Execution History
1. Go to Scenarios → Your scenario
2. Click on "Execution history" 
3. Review successful and failed executions
4. Check response data for each test

## 🎯 Production Tips

### Best Practices for Live Integration
1. **Use unique session IDs**: Include timestamp or UUID
2. **Handle errors gracefully**: Check response status in Make.com
3. **Add logging**: Store successful webhook calls in Make.com data store
4. **Monitor regularly**: Set up alerts for failed webhook calls

### Recommended Make.com Flow
```
Trigger → Process Evaluation → HTTP Webhook → Handle Response → Log Result
```

### Error Handling in Make.com
Add error handling after the HTTP module:
- If status ≠ 200: Log error and possibly retry
- If status = 200: Continue with success flow
- Parse response to get evaluation_id for tracking

---

💡 **Pro Tip**: Start with Test 1, then gradually move to more complex tests. The webhook is fully functional and ready for production use!