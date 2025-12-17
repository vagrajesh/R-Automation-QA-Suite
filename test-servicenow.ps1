# Test ServiceNow Integration Endpoints

Write-Host "Testing ServiceNow Integration..." -ForegroundColor Cyan

# Create a session to maintain cookies
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri 'http://localhost:8080/api/health' -Method GET -UseBasicParsing
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "✅ Health Check: $($healthData.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: ServiceNow Connection
Write-Host "`n2. Testing ServiceNow Connection..." -ForegroundColor Yellow
$connectBody = @{
    instanceUrl = 'https://dev182432.service-now.com'
    username = 'admin'
    password = 'xVFx2o*B5^Yi'
} | ConvertTo-Json

try {
    $connectResponse = Invoke-WebRequest -Uri 'http://localhost:8080/api/servicenow/connect' `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body $connectBody `
        -UseBasicParsing `
        -WebSession $session
    $connectData = $connectResponse.Content | ConvertFrom-Json
    Write-Host "✅ ServiceNow Connection: $($connectData.message)" -ForegroundColor Green
    Write-Host "   Records checked: $($connectData.recordCount)" -ForegroundColor Green
} catch {
    Write-Host "❌ ServiceNow Connection Failed:" -ForegroundColor Red
    Write-Host $_.Exception.Response.Content -ForegroundColor Red
    exit 1
}

# Test 3: Fetch ServiceNow Stories
Write-Host "`n3. Testing Fetch ServiceNow Stories..." -ForegroundColor Yellow
try {
    $storiesResponse = Invoke-WebRequest -Uri 'http://localhost:8080/api/servicenow/stories' `
        -Method GET `
        -UseBasicParsing `
        -WebSession $session
    $storiesData = $storiesResponse.Content | ConvertFrom-Json
    Write-Host "✅ ServiceNow Stories Retrieved:" -ForegroundColor Green
    Write-Host "   Total stories: $($storiesData.stories.Count)" -ForegroundColor Green
    if ($storiesData.stories.Count -gt 0) {
        Write-Host "   First story: $($storiesData.stories[0].title)" -ForegroundColor Green
        Write-Host "   Status: $($storiesData.stories[0].status)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Fetch Stories Failed:" -ForegroundColor Red
    Write-Host $_.Exception.Response.Content -ForegroundColor Red
    exit 1
}

# Test 4: Test with custom query
Write-Host "`n4. Testing Fetch Stories with Query Parameter..." -ForegroundColor Yellow
$query = [System.Web.HttpUtility]::UrlEncode('state=1^ORDERBYDESCsys_created_on')
try {
    $queryResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/servicenow/stories?q=$query" `
        -Method GET `
        -UseBasicParsing `
        -WebSession $session
    $queryData = $queryResponse.Content | ConvertFrom-Json
    Write-Host "✅ Stories with Query Filter Retrieved:" -ForegroundColor Green
    Write-Host "   Stories found: $($queryData.stories.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Query Filter Test Failed:" -ForegroundColor Red
    Write-Host $_.Exception.Response.Content -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All ServiceNow Integration Tests Passed!" -ForegroundColor Green
