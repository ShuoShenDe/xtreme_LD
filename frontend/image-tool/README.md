# Image Tool

## Development Setup

### Local Configuration

For local development, you can create a `vite.config.local.js` file to customize your development environment:

```bash
# Copy the example file
cp vite.config.local.example.js vite.config.local.js

# Edit according to your needs
# This file is ignored by git and won't be committed
```

### Environment Variables

You can control the behavior using environment variables:

```bash
# Control Mock API logs
VITE_SHOW_MOCK_LOGS=true

# Disable Mock API completely
VITE_DISABLE_MOCK=true

# Custom test token
VITE_TEST_TOKEN=your-custom-token
```

### Mock API

The local configuration includes a Mock API plugin that provides test data for development. This allows you to work without a full backend setup.

To disable Mock API logging:
```bash
# In your .env.local file
VITE_SHOW_MOCK_LOGS=false
```

## Getting Started

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```
