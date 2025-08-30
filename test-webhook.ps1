# PowerShell script to test webhook endpoint
Write-Host "🧪 Testing Medical Learning App Webhook" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: GET request (status check)
Write-Host ""
Write-Host "📋 Test 1: GET Status Check" -ForegroundColor Yellow
Write-Host "URL: https://medical-learning-app.netlify.app/api/webhook-evaluation"

try {
    $response1 = Invoke-RestMethod -Uri "https://medical-learning-app.netlify.app/api/webhook-evaluation" -Method GET -Headers @{"Accept"="application/json"}
    Write-Host "✅ GET Test Successful" -ForegroundColor Green
    $response1 | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "❌ GET Test Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan

# Test 2: POST request (actual data)
Write-Host ""
Write-Host "📤 Test 2: POST Evaluation Data" -ForegroundColor Yellow
Write-Host "Sending test evaluation..."

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.000Z")
$sessionId = "ps_test_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

$body = @{
    user_id = "afc76840-d38c-402b-af90-bfead14c6597"
    session_id = $sessionId
    exam_type = "KP"
    conversation_type = "patient"
    score = 95
    evaluation = "PowerShell test evaluation - webhook working perfectly!"
    timestamp = $timestamp
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "https://medical-learning-app.netlify.app/api/webhook-evaluation" -Method POST -Body $body -ContentType "application/json" -Headers @{"Accept"="application/json"}
    Write-Host "✅ POST Test Successful" -ForegroundColor Green
    $response2 | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response2.success) {
        Write-Host ""
        Write-Host "🎉 Evaluation stored successfully!" -ForegroundColor Green
        Write-Host "Evaluation ID: $($response2.data.evaluation_id)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ POST Test Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Test Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Expected Results:" -ForegroundColor White
Write-Host "- Test 1 should return status 200 with endpoint documentation" -ForegroundColor White
Write-Host "- Test 2 should return status 200 with success: true and evaluation_id" -ForegroundColor White
Write-Host ""
Write-Host "If both tests pass, the webhook is ready for Make.com integration!" -ForegroundColor Green