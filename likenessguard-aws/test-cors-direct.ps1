# Test CORS directly with PowerShell
$apiUrl = "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/register"

Write-Host "Testing CORS for /register endpoint..." -ForegroundColor Cyan
Write-Host ""

# Test 1: OPTIONS preflight request
Write-Host "TEST 1: OPTIONS Preflight Request" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
try {
    $headers = @{
        'Origin' = 'http://localhost:5173'
        'Access-Control-Request-Method' = 'POST'
        'Access-Control-Request-Headers' = 'content-type,x-api-key'
    }
    
    $response = Invoke-WebRequest -Uri $apiUrl -Method OPTIONS -Headers $headers -UseBasicParsing
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response Headers:" -ForegroundColor White
    $response.Headers.GetEnumerator() | Where-Object { $_.Key -like "*Access-Control*" } | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Cyan
    }
    
    # Check for required CORS headers
    $hasOrigin = $response.Headers['Access-Control-Allow-Origin']
    $hasHeaders = $response.Headers['Access-Control-Allow-Headers']
    $hasMethods = $response.Headers['Access-Control-Allow-Methods']
    
    Write-Host ""
    if ($hasOrigin) {
        Write-Host "✓ Access-Control-Allow-Origin: $hasOrigin" -ForegroundColor Green
    } else {
        Write-Host "✗ Access-Control-Allow-Origin: MISSING" -ForegroundColor Red
    }
    
    if ($hasHeaders) {
        Write-Host "✓ Access-Control-Allow-Headers: $hasHeaders" -ForegroundColor Green
    } else {
        Write-Host "✗ Access-Control-Allow-Headers: MISSING" -ForegroundColor Red
    }
    
    if ($hasMethods) {
        Write-Host "✓ Access-Control-Allow-Methods: $hasMethods" -ForegroundColor Green
    } else {
        Write-Host "✗ Access-Control-Allow-Methods: MISSING" -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ OPTIONS request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Test 2: Actual POST request
Write-Host "TEST 2: POST Request (with API Key)" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
try {
    $headers = @{
        'Content-Type' = 'application/json'
        'X-API-Key' = 'Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw'
        'Origin' = 'http://localhost:5173'
    }
    
    $body = @{
        user_id = "test-cors-$(Get-Date -Format 'yyyyMMddHHmmss')"
        email = "test@example.com"
        photo_keys = @("test1.jpg", "test2.jpg", "test3.jpg", "test4.jpg", "test5.jpg")
        consent_policy = @{
            allow_commercial = $false
            allow_editorial = $true
            allow_research = $true
            expiration_date = $null
        }
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri $apiUrl -Method POST -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response Headers:" -ForegroundColor White
    $response.Headers.GetEnumerator() | Where-Object { $_.Key -like "*Access-Control*" } | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Cyan
    }
    
    # Check for CORS header in POST response
    $hasOrigin = $response.Headers['Access-Control-Allow-Origin']
    
    Write-Host ""
    if ($hasOrigin) {
        Write-Host "✓ Access-Control-Allow-Origin: $hasOrigin" -ForegroundColor Green
    } else {
        Write-Host "✗ Access-Control-Allow-Origin: MISSING (THIS IS THE PROBLEM!)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ POST request failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host ""
Write-Host "DIAGNOSIS:" -ForegroundColor Magenta
Write-Host "==========" -ForegroundColor Magenta
Write-Host "If OPTIONS returns CORS headers but POST doesn't, the Lambda function" -ForegroundColor White
Write-Host "is not returning CORS headers in its response." -ForegroundColor White
Write-Host ""
Write-Host "Solution: Update Lambda function to include CORS headers in ALL responses." -ForegroundColor Yellow
