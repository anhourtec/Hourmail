#!/bin/bash
set -e

echo "========================================="
echo "  HourInbox — Build & Deploy"
echo "========================================="
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed."
  echo "Install it: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! command -v docker compose &> /dev/null; then
  echo "Error: Docker Compose (v2) is not installed."
  echo "Install it: https://docs.docker.com/compose/install/"
  exit 1
fi

# Create .env from example if missing
if [ ! -f .env ]; then
  echo "No .env file found. Creating from .env.example..."
  cp .env.example .env

  # Generate a random session secret
  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
  sed -i "s/change-me-to-a-random-64-char-string/$SECRET/" .env

  echo "Created .env with a random session secret."
  echo "Review and edit .env if needed, then re-run this script."
  exit 0
fi

# Load .env values for display
source .env

APP_PORT=${NUXT_PORT:-3847}

echo "Building and starting containers..."
echo ""

# Build and start
docker compose up -d --build

echo ""
echo "========================================="
echo "  HourInbox is running!"
echo "========================================="
echo ""
echo "  App:        http://localhost:$APP_PORT"
echo ""
echo "  Logs:       docker compose logs -f app"
echo "  Stop:       docker compose down"
echo ""
