# Demo Mode Feature

## Overview
The Interpose Dashboard now includes a demo mode that allows users to explore the platform without authentication, using realistic mock data.

## Features

### 1. Demo Mode Button
- Located on the authentication form
- Prominent cyberpunk-themed styling with gradient background (magenta to cyan)
- Rocket emoji icon (🚀) for visual appeal
- Hover effects with glow animation
- Clear description: "Explore the dashboard with realistic sample data"

### 2. Mock Data
The demo mode generates 18 realistic log entries with:

#### AI Services
- **OpenAI**: `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`
- **Anthropic**: `/v1/messages`, `/v1/complete`
- **Bedrock**: `/model/anthropic.claude-v2/invoke`, `/model/amazon.titan-text/invoke`

#### Risk Score Distribution
- **Low Risk (10-39)**: 6 entries
- **Medium Risk (40-69)**: 7 entries
- **High Risk (70-99)**: 5 entries

#### Data Sources
Variety of realistic sources including:
- Databases: PostgreSQL, MySQL, MongoDB, DynamoDB, Redis, Elasticsearch
- Cloud Storage: S3 buckets
- Files: CSV, JSON configuration files
- APIs: Internal and external services (Stripe, CRM)

#### Sensitive Data Types
- Email addresses
- Phone numbers
- API keys and passwords
- OAuth tokens
- SSN and credit card information
- IP addresses
- Session tokens

#### Timestamps
- Spread across the last 24 hours
- Realistic distribution for timeline visualization

#### HTTP Status Codes
- Mostly 200 (success)
- One 429 (rate limit)
- One 500 (server error)

### 3. Dashboard Features Showcased
The demo mode displays all dashboard components with realistic data:

1. **Activity Log**: Shows all 18 log entries with full details
2. **Risk Gauges**: Displays average risk score across all entries
3. **System Map**: Visualizes connections between AI services and data sources
4. **Alert Cards**: Highlights high-risk activities
5. **Timeline Chart**: Shows activity distribution over 24 hours

### 4. Demo Mode Indicator
- "• DEMO MODE" label appears in the header subtitle
- Styled with magenta color and glow effect
- "Exit Demo" button replaces "Logout" button

## User Flow

1. User visits the dashboard
2. Clicks "View Demo" button on the auth form
3. Dashboard loads with mock data
4. User can explore all features
5. Click "Exit Demo" to return to login screen

## Technical Implementation

### Files Modified
- `dashboard/src/App.tsx`: Added demo mode state and logic
- `dashboard/src/components/AuthForm.tsx`: Added demo button and styling

### Files Created
- `dashboard/src/data/mockLogs.ts`: Mock data generator

### Key Changes
- Added `isDemoMode` state to App component
- Modified authentication check to allow demo mode
- Added `onDemoMode` prop to AuthForm
- Created `generateMockLogs()` function for realistic data
- Added visual indicators for demo mode

## Benefits

1. **User Onboarding**: New users can explore features before signing up
2. **Sales Demos**: Quick way to showcase platform capabilities
3. **Testing**: Developers can test UI with consistent data
4. **Documentation**: Screenshots and videos can use demo mode
5. **No Backend Required**: Works without API connectivity

## Future Enhancements

Potential improvements:
- Add more log entries (50-100)
- Include real-time simulation (logs appearing over time)
- Add different demo scenarios (high-risk, normal, low-risk)
- Allow customization of demo data
- Add guided tour of features in demo mode
