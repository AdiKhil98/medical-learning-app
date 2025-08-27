# Webhook Endpoint for Make.com Integration

## 📍 Webhook URL
**Development:**
```
http://localhost:8081/api/webhook/evaluation
```

**Production (when deployed):**
```
https://your-domain.com/api/webhook/evaluation
```

## 🔄 HTTP Method
**POST**

## 📋 Required Fields
```json
{
  "user_id": "uuid-string-here",
  "evaluation_name": "string",
  "score": "string"
}
```

## 📝 Example Request Body
```json
{
  "user_id": "12345678-1234-1234-1234-123456789012",
  "evaluation_name": "Kardiologie Test",
  "score": "Sehr gut (90-100%)"
}
```

## ✅ Success Response (200)
```json
{
  "success": true,
  "message": "Evaluation saved successfully",
  "data": {
    "id": "evaluation-uuid",
    "user_id": "user-uuid",
    "evaluation_name": "Kardiologie Test",
    "score": "Sehr gut (90-100%)",
    "created_at": "2025-08-22T10:00:00.000Z",
    "updated_at": "2025-08-22T10:00:00.000Z"
  }
}
```

## ❌ Error Response (400)
```json
{
  "error": "Missing required fields: user_id, evaluation_name, score"
}
```

## 🔍 Testing the Endpoint
You can test the GET method to verify the endpoint is running:
```
GET http://localhost:8081/api/webhook/evaluation
```

## 📊 Database Integration
- Evaluations are stored in the `user_evaluations` table
- Users can view their evaluations in the Progress tab
- Data appears automatically in the app after webhook receives it

## 🎯 Make.com Configuration
1. Use HTTP module in Make.com
2. Set URL to your webhook endpoint
3. Set method to POST
4. Include the required JSON fields in the body
5. Evaluations will appear immediately in the user's progress tab