<#
.SYNOPSIS
    Comprehensive test runner for the Interpose SaaS Platform
.DESCRIPTION
    Runs all tests across the project including:
    - Python tests (agent + backend) with pytest
    - Dashboard TypeScript/React tests with Jest
    Provides colored output and comprehensive summary.
.EXAMPLE
    .\run-all-tests.ps1
#>

# Enable strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# Initialize counters
$script:TotalTests = 0
$script:PassedTests = 0
$script:FailedTests = 0
$script:TestSuites = @()

# Helper function for colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline
    )
    if ($NoNewline) {
        Write-Host $Message -ForegroundColor $Color -NoNewline
    } else {
        Write-Host $Message -ForegroundColor $Color
    }
}

# Helper function for section headers
function Write-SectionHeader {
    param([string]$Title)
    Write-Host ""
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" "Cyan"
    Write-ColorOutput "  $Title" "Cyan"
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" "Cyan"
    Write-Host ""
}

# Helper function to check if a command exists
function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Helper function to record test results
function Add-TestResult {
    param(
        [string]$SuiteName,
        [bool]$Success,
        [int]$Passed = 0,
        [int]$Failed = 0,
        [string]$Duration = "N/A"
    )
    
    $script:TestSuites += [PSCustomObject]@{
        Suite = $SuiteName
        Success = $Success
        Passed = $Passed
        Failed = $Failed
        Duration = $Duration
    }
    
    $script:PassedTests += $Passed
    $script:FailedTests += $Failed
    $script:TotalTests += ($Passed + $Failed)
}

# Main script starts here
Write-SectionHeader "INTERPOSE PLATFORM - TEST SUITE RUNNER"

Write-ColorOutput "Starting comprehensive test suite..." "White"
Write-ColorOutput "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "Gray"
Write-Host ""

# ============================================================================
# STEP 1: Check Prerequisites
# ============================================================================
Write-SectionHeader "STEP 1: Checking Prerequisites"

$prerequisitesFailed = $false

# Check Python
Write-ColorOutput "Checking Python... " "Yellow" -NoNewline
if (Test-CommandExists "python") {
    $pythonVersion = python --version 2>&1
    Write-ColorOutput "✓ Found ($pythonVersion)" "Green"
} else {
    Write-ColorOutput "✗ Not found" "Red"
    $prerequisitesFailed = $true
}

# Check pytest
Write-ColorOutput "Checking pytest... " "Yellow" -NoNewline
if (Test-CommandExists "pytest") {
    $pytestVersion = pytest --version 2>&1 | Select-Object -First 1
    Write-ColorOutput "✓ Found ($pytestVersion)" "Green"
} else {
    Write-ColorOutput "✗ Not found" "Red"
    Write-ColorOutput "  Install with: pip install pytest" "Gray"
    $prerequisitesFailed = $true
}

# Check Node.js
Write-ColorOutput "Checking Node.js... " "Yellow" -NoNewline
if (Test-CommandExists "node") {
    $nodeVersion = node --version 2>&1
    Write-ColorOutput "✓ Found ($nodeVersion)" "Green"
} else {
    Write-ColorOutput "✗ Not found" "Red"
    $prerequisitesFailed = $true
}

# Check npm
Write-ColorOutput "Checking npm... " "Yellow" -NoNewline
if (Test-CommandExists "npm") {
    $npmVersion = npm --version 2>&1
    Write-ColorOutput "✓ Found (v$npmVersion)" "Green"
} else {
    Write-ColorOutput "✗ Not found" "Red"
    $prerequisitesFailed = $true
}

if ($prerequisitesFailed) {
    Write-Host ""
    Write-ColorOutput "✗ Prerequisites check failed. Please install missing tools." "Red"
    exit 1
}

Write-Host ""
Write-ColorOutput "✓ All prerequisites satisfied" "Green"

# ============================================================================
# STEP 2: Run Python Tests (Agent)
# ============================================================================
Write-SectionHeader "STEP 2: Running Python Tests - Agent"

Write-ColorOutput "Running pytest for interpose/agent/tests..." "Yellow"
Write-Host ""

$agentTestStart = Get-Date
$agentTestPath = "interpose/agent/tests"

if (Test-Path $agentTestPath) {
    try {
        # Run pytest with verbose output and capture results
        $pytestOutput = pytest $agentTestPath -v --tb=short --color=yes 2>&1
        $agentTestSuccess = $LASTEXITCODE -eq 0
        
        # Display output
        $pytestOutput | ForEach-Object { Write-Host $_ }
        
        # Parse results
        $resultLine = $pytestOutput | Select-String "(\d+) passed|(\d+) failed" | Select-Object -Last 1
        $passed = 0
        $failed = 0
        
        if ($resultLine -match "(\d+) passed") { $passed = [int]$Matches[1] }
        if ($resultLine -match "(\d+) failed") { $failed = [int]$Matches[1] }
        
        $agentTestDuration = ((Get-Date) - $agentTestStart).TotalSeconds
        
        Write-Host ""
        if ($agentTestSuccess) {
            Write-ColorOutput "✓ Agent tests passed ($passed tests, $($agentTestDuration.ToString('F2'))s)" "Green"
        } else {
            Write-ColorOutput "✗ Agent tests failed ($passed passed, $failed failed, $($agentTestDuration.ToString('F2'))s)" "Red"
        }
        
        Add-TestResult -SuiteName "Agent Tests" -Success $agentTestSuccess -Passed $passed -Failed $failed -Duration "$($agentTestDuration.ToString('F2'))s"
    }
    catch {
        Write-ColorOutput "✗ Error running agent tests: $_" "Red"
        Add-TestResult -SuiteName "Agent Tests" -Success $false -Passed 0 -Failed 1 -Duration "N/A"
    }
} else {
    Write-ColorOutput "⚠ Agent test directory not found: $agentTestPath" "Yellow"
    Add-TestResult -SuiteName "Agent Tests" -Success $false -Passed 0 -Failed 0 -Duration "N/A"
}

# ============================================================================
# STEP 3: Run Python Tests (Backend)
# ============================================================================
Write-SectionHeader "STEP 3: Running Python Tests - Backend"

Write-ColorOutput "Running pytest for backend/tests..." "Yellow"
Write-Host ""

$backendTestStart = Get-Date
$backendTestPath = "backend/tests"

if (Test-Path $backendTestPath) {
    try {
        # Run pytest with verbose output and capture results
        $pytestOutput = pytest $backendTestPath -v --tb=short --color=yes 2>&1
        $backendTestSuccess = $LASTEXITCODE -eq 0
        
        # Display output
        $pytestOutput | ForEach-Object { Write-Host $_ }
        
        # Parse results
        $resultLine = $pytestOutput | Select-String "(\d+) passed|(\d+) failed" | Select-Object -Last 1
        $passed = 0
        $failed = 0
        
        if ($resultLine -match "(\d+) passed") { $passed = [int]$Matches[1] }
        if ($resultLine -match "(\d+) failed") { $failed = [int]$Matches[1] }
        
        $backendTestDuration = ((Get-Date) - $backendTestStart).TotalSeconds
        
        Write-Host ""
        if ($backendTestSuccess) {
            Write-ColorOutput "✓ Backend tests passed ($passed tests, $($backendTestDuration.ToString('F2'))s)" "Green"
        } else {
            Write-ColorOutput "✗ Backend tests failed ($passed passed, $failed failed, $($backendTestDuration.ToString('F2'))s)" "Red"
        }
        
        Add-TestResult -SuiteName "Backend Tests" -Success $backendTestSuccess -Passed $passed -Failed $failed -Duration "$($backendTestDuration.ToString('F2'))s"
    }
    catch {
        Write-ColorOutput "✗ Error running backend tests: $_" "Red"
        Add-TestResult -SuiteName "Backend Tests" -Success $false -Passed 0 -Failed 1 -Duration "N/A"
    }
} else {
    Write-ColorOutput "⚠ Backend test directory not found: $backendTestPath" "Yellow"
    Add-TestResult -SuiteName "Backend Tests" -Success $false -Passed 0 -Failed 0 -Duration "N/A"
}

# ============================================================================
# STEP 4: Run Integration Tests
# ============================================================================
Write-SectionHeader "STEP 4: Running Integration Tests"

Write-ColorOutput "Running pytest for tests/integration..." "Yellow"
Write-Host ""

$integrationTestStart = Get-Date
$integrationTestPath = "tests/integration"

if (Test-Path $integrationTestPath) {
    try {
        # Run pytest with verbose output and capture results
        $pytestOutput = pytest $integrationTestPath -v --tb=short --color=yes 2>&1
        $integrationTestSuccess = $LASTEXITCODE -eq 0
        
        # Display output
        $pytestOutput | ForEach-Object { Write-Host $_ }
        
        # Parse results
        $resultLine = $pytestOutput | Select-String "(\d+) passed|(\d+) failed" | Select-Object -Last 1
        $passed = 0
        $failed = 0
        
        if ($resultLine -match "(\d+) passed") { $passed = [int]$Matches[1] }
        if ($resultLine -match "(\d+) failed") { $failed = [int]$Matches[1] }
        
        $integrationTestDuration = ((Get-Date) - $integrationTestStart).TotalSeconds
        
        Write-Host ""
        if ($integrationTestSuccess) {
            Write-ColorOutput "✓ Integration tests passed ($passed tests, $($integrationTestDuration.ToString('F2'))s)" "Green"
        } else {
            Write-ColorOutput "✗ Integration tests failed ($passed passed, $failed failed, $($integrationTestDuration.ToString('F2'))s)" "Red"
        }
        
        Add-TestResult -SuiteName "Integration Tests" -Success $integrationTestSuccess -Passed $passed -Failed $failed -Duration "$($integrationTestDuration.ToString('F2'))s"
    }
    catch {
        Write-ColorOutput "✗ Error running integration tests: $_" "Red"
        Add-TestResult -SuiteName "Integration Tests" -Success $false -Passed 0 -Failed 1 -Duration "N/A"
    }
} else {
    Write-ColorOutput "⚠ Integration test directory not found: $integrationTestPath" "Yellow"
}

# ============================================================================
# STEP 5: Run Dashboard Tests (Jest)
# ============================================================================
Write-SectionHeader "STEP 5: Running Dashboard Tests (Jest)"

$dashboardPath = "dashboard"

if (Test-Path $dashboardPath) {
    Write-ColorOutput "Changing to dashboard directory..." "Yellow"
    Push-Location $dashboardPath
    
    try {
        # Check if node_modules exists
        if (-not (Test-Path "node_modules")) {
            Write-ColorOutput "⚠ node_modules not found. Running npm install..." "Yellow"
            npm install
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput "✗ npm install failed" "Red"
                Pop-Location
                Add-TestResult -SuiteName "Dashboard Tests" -Success $false -Passed 0 -Failed 1 -Duration "N/A"
                throw "npm install failed"
            }
        }
        
        Write-Host ""
        Write-ColorOutput "Running npm test..." "Yellow"
        Write-Host ""
        
        $dashboardTestStart = Get-Date
        
        # Run npm test and capture output
        $npmOutput = npm test -- --passWithNoTests --colors 2>&1
        $dashboardTestSuccess = $LASTEXITCODE -eq 0
        
        # Display output
        $npmOutput | ForEach-Object { Write-Host $_ }
        
        # Parse results from Jest output
        $passed = 0
        $failed = 0
        
        # Look for Jest summary line
        $summaryLine = $npmOutput | Select-String "Tests:.*(\d+) passed" | Select-Object -Last 1
        if ($summaryLine -match "(\d+) failed") { $failed = [int]$Matches[1] }
        if ($summaryLine -match "(\d+) passed") { $passed = [int]$Matches[1] }
        
        $dashboardTestDuration = ((Get-Date) - $dashboardTestStart).TotalSeconds
        
        Write-Host ""
        if ($dashboardTestSuccess) {
            Write-ColorOutput "✓ Dashboard tests passed ($passed tests, $($dashboardTestDuration.ToString('F2'))s)" "Green"
        } else {
            Write-ColorOutput "✗ Dashboard tests failed ($passed passed, $failed failed, $($dashboardTestDuration.ToString('F2'))s)" "Red"
        }
        
        Add-TestResult -SuiteName "Dashboard Tests" -Success $dashboardTestSuccess -Passed $passed -Failed $failed -Duration "$($dashboardTestDuration.ToString('F2'))s"
    }
    catch {
        Write-ColorOutput "✗ Error running dashboard tests: $_" "Red"
        Add-TestResult -SuiteName "Dashboard Tests" -Success $false -Passed 0 -Failed 1 -Duration "N/A"
    }
    finally {
        Pop-Location
    }
} else {
    Write-ColorOutput "⚠ Dashboard directory not found: $dashboardPath" "Yellow"
    Add-TestResult -SuiteName "Dashboard Tests" -Success $false -Passed 0 -Failed 0 -Duration "N/A"
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-SectionHeader "TEST SUMMARY"

# Display results table
Write-ColorOutput "Test Suite Results:" "Cyan"
Write-Host ""

$tableFormat = "{0,-25} {1,-10} {2,-10} {3,-10} {4,-15}"
Write-ColorOutput ($tableFormat -f "Suite", "Status", "Passed", "Failed", "Duration") "White"
Write-ColorOutput ($tableFormat -f "─────", "──────", "──────", "──────", "────────") "Gray"

foreach ($suite in $script:TestSuites) {
    $statusSymbol = if ($suite.Success) { "✓ PASS" } else { "✗ FAIL" }
    $statusColor = if ($suite.Success) { "Green" } else { "Red" }
    
    Write-ColorOutput ($suite.Suite.PadRight(25)) "White" -NoNewline
    Write-ColorOutput ($statusSymbol.PadRight(10)) $statusColor -NoNewline
    Write-ColorOutput ($suite.Passed.ToString().PadRight(10)) "White" -NoNewline
    Write-ColorOutput ($suite.Failed.ToString().PadRight(10)) "White" -NoNewline
    Write-ColorOutput ($suite.Duration.PadRight(15)) "White"
}

Write-Host ""
Write-ColorOutput "─────────────────────────────────────────────────────────────" "Gray"

# Overall statistics
$allPassed = ($script:TestSuites | Where-Object { -not $_.Success }).Count -eq 0

Write-Host ""
Write-ColorOutput "Total Tests Run: " "White" -NoNewline
Write-ColorOutput $script:TotalTests "Cyan"

Write-ColorOutput "Tests Passed:    " "White" -NoNewline
Write-ColorOutput $script:PassedTests "Green"

Write-ColorOutput "Tests Failed:    " "White" -NoNewline
if ($script:FailedTests -gt 0) {
    Write-ColorOutput $script:FailedTests "Red"
} else {
    Write-ColorOutput $script:FailedTests "Green"
}

Write-Host ""

# Final verdict
if ($allPassed -and $script:FailedTests -eq 0) {
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" "Green"
    Write-ColorOutput "  ✓ ALL TESTS PASSED!" "Green"
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" "Green"
    exit 0
} else {
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" "Red"
    Write-ColorOutput "  ✗ SOME TESTS FAILED" "Red"
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" "Red"
    exit 1
}
