# Check Lambda Logs for Registration Function

Write-Host "=== Checking Lambda Logs ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Fetching recent logs from LikenessGuard-Registration..." -ForegroundColor Yellow
Write-Host ""

# Get the most recent log stream
$logStreams = aws logs describe-log-streams `
    --log-group-name "/aws/lambda/LikenessGuard-Registration" `
    --order-by LastEventTime `
    --descending `
    --max-items 1 `
    --output json | ConvertFrom-Json

if ($logStreams.logStreams.Count -eq 0) {
    Write-Host "No log streams found" -ForegroundColor Red
    exit 1
}

$latestStream = $logStreams.logStreams[0].logStreamName
Write-Host "Latest log stream: $latestStream" -ForegroundColor Gray
Write-Host ""

# Get the logs
$logs = aws logs get-log-events `
    --log-group-name "/aws/lambda/LikenessGuard-Registration" `
    --log-stream-name $latestStream `
    --limit 100 `
    --output json | ConvertFrom-Json

Write-Host "Recent log events:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

foreach ($event in $logs.events) {
    $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($event.timestamp).LocalDateTime
    $message = $event.message
    
    # Color code based on log level
    if ($message -match "ERROR|Error|error|CRITICAL") {
        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
        Write-Host $message -ForegroundColor Red
    }
    elseif ($message -match "WARNING|Warning|warning") {
        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
        Write-Host $message -ForegroundColor Yellow
    }
    elseif ($message -match "INFO|Info") {
        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
        Write-Host $message -ForegroundColor White
    }
    else {
        Write-Host "[$timestamp] $message" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "==================" -ForegroundColor Cyan
