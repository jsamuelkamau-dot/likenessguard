# Check Registration Lambda Logs
Write-Host "Fetching recent Registration Lambda logs..." -ForegroundColor Cyan

# Get the most recent log stream
$logStreamJson = aws logs describe-log-streams `
    --log-group-name "/aws/lambda/LikenessGuard-Registration" `
    --order-by LastEventTime `
    --descending `
    --max-items 1 `
    --region us-east-1 | ConvertFrom-Json

$logStreamName = $logStreamJson.logStreams[0].logStreamName

Write-Host "Latest log stream: $logStreamName" -ForegroundColor Yellow

# Get the logs
Write-Host "`nFetching logs..." -ForegroundColor Yellow
$logsJson = aws logs get-log-events `
    --log-group-name "/aws/lambda/LikenessGuard-Registration" `
    --log-stream-name $logStreamName `
    --region us-east-1 `
    --limit 100 | ConvertFrom-Json

foreach ($event in $logsJson.events) {
    $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($event.timestamp).LocalDateTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$timestamp] $($event.message)"
}
