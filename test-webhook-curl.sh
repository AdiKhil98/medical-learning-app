#!/bin/bash
# Quick curl test for webhook endpoint

echo "🧪 Testing Medical Learning App Webhook"
echo "========================================"

# Test 1: GET request (status check)
echo ""
echo "📋 Test 1: GET Status Check"
echo "URL: https://medical-learning-app.netlify.app/api/webhook-evaluation"
curl -X GET "https://medical-learning-app.netlify.app/api/webhook-evaluation" \
  -H "Accept: application/json" \
  -w "\nStatus Code: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "=================================="

# Test 2: POST request (actual data)
echo ""
echo "📤 Test 2: POST Evaluation Data" 
echo "Sending test evaluation..."
curl -X POST "https://medical-learning-app.netlify.app/api/webhook-evaluation" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -w "\nStatus Code: %{http_code}\n" \
  -d '{
    "user_id": "afc76840-d38c-402b-af90-bfead14c6597",
    "session_id": "curl_test_'$(date +%s)'",
    "exam_type": "KP",
    "conversation_type": "patient", 
    "score": 95,
    "evaluation": "Curl test evaluation - webhook working perfectly!",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }' \
  -s | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✅ Test Complete!"
echo ""
echo "Expected Results:"
echo "- Test 1 should return status 200 with endpoint documentation"
echo "- Test 2 should return status 200 with success: true and evaluation_id"
echo ""
echo "If both tests pass, the webhook is ready for Make.com integration!"