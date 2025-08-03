#!/bin/bash

# Script to create an OTA update for testing
# Usage: ./scripts/create-ota-update.sh [channel]

set -e

CHANNEL=${1:-production}
PROJECT_ID="b4f22400-7632-4de3-bcd1-76119d301f5d"

echo "🚀 Creating OTA Update"
echo "Channel: $CHANNEL"
echo "Project ID: $PROJECT_ID"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Please install it first:"
    echo "npm install -g eas-cli"
    exit 1
fi

# Check if logged in
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please run:"
    echo "eas login"
    exit 1
fi

# Create the update
echo "📦 Creating update for channel: $CHANNEL"
eas update --channel $CHANNEL --message "Test update $(date +%Y-%m-%d_%H-%M-%S)"

echo ""
echo "✅ Update created successfully!"
echo ""
echo "📱 To test the update:"
echo "1. Make sure your app is built with the same channel ($CHANNEL)"
echo "2. Open the app and it should automatically check for updates"
echo "3. Or manually check for updates in the app"
echo ""
echo "🔍 To view recent updates:"
echo "eas update:list --channel $CHANNEL --limit 5" 