# LikenessGuard Web Dashboard

A modern web-based interface for managing likeness protection, consent policies, and monitoring unauthorized usage through the LikenessGuard AWS backend infrastructure.

## Features

- **Dashboard Home**: Overview of registered likenesses, consent policies, and recent activity
- **Likeness Registration**: Upload photos to register your likeness
- **Consent Policy Management**: Configure and update consent policies
- **Consent Check Tool**: Test consent checks with reference images
- **Activity Logs**: View historical consent check activity
- **Violations Panel**: Monitor detected unauthorized usage

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and optimized builds
- **React Router** for navigation
- **Axios** for API communication
- **Vitest** + React Testing Library for unit tests
- **fast-check** for property-based testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Building for Production

```bash
# Build production bundle
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Shared components (Button, Card, Input)
│   ├── layout/          # Layout components (Sidebar, Header)
│   ├── registration/    # Registration-specific components
│   ├── consent/         # Consent management components
│   ├── logs/            # Activity logs components
│   └── violations/      # Violations panel components
├── services/            # API client and business logic
├── hooks/               # Custom React hooks
├── store/               # State management
├── types/               # TypeScript type definitions
├── styles/              # Global styles and theme
├── pages/               # Page-level components
└── test/                # Test setup and utilities
```

## Configuration

API endpoints can be configured in `src/services/api-client.ts`. Update the `baseURL` to point to your deployed LikenessGuard backend.

## Design System

The dashboard uses a futuristic AI cybersecurity color scheme:

- **Primary Backgrounds**: Deep dark blues (#050B18, #0B1224, #0E1A2F, #111F3A)
- **Action Colors**: Vibrant greens (#62D84E, #4BC236, #7CFF6B)
- **AI Accents**: Purple/violet (#7B4CFF, #A37BFF, #2C1D75)
- **Status Colors**: 
  - Success/Allow: #4FA3FF
  - Error/Deny: #FF7A45
  - Neutral/Unknown: #4B556A

## License

This project is part of the AWS 10,000 AIdeas Competition submission.
