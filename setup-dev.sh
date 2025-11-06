#!/bin/bash

# Social App Frontend Development Environment Setup Script
# Run this script to set up your local development environment

set -e  # Exit on error

echo "========================================"
echo "Setting up Social App Development Environment"
echo "========================================"

# Check Node.js version
echo ""
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js 14.x or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Found Node.js $NODE_VERSION"

# Check npm version
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "Found npm $NPM_VERSION"

# Install dependencies
echo ""
echo "Installing npm dependencies..."
npm install

# Check if .env file exists (if needed)
echo ""
if [ -f ".env" ]; then
    echo ".env file exists."
else
    echo "Note: No .env file found (may not be needed for this app)"
    echo "If you need environment variables, create a .env file in this directory"
fi

echo ""
echo "========================================"
echo "Setup complete!"
echo "========================================"
echo ""
echo "To start the development server:"
echo "  npm start"
echo ""
echo "The app will be available at: http://localhost:3000"
echo ""
echo "To build for production:"
echo "  npm run build"
echo ""
echo "The build output will be in the 'build' directory"
echo ""
