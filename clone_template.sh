#!/bin/bash

# Clone Template Script for Coeus CRM
# Usage: ./clone_template.sh /path/to/new-project

TARGET_DIR=$1

if [ -z "$TARGET_DIR" ]; then
    echo "Usage: ./clone_template.sh /path/to/new-project"
    exit 1
fi

mkdir -p "$TARGET_DIR"

echo "Cloning Coeus CRM to $TARGET_DIR..."

# Copy files excluding git, node_modules, dist, and env files
rsync -av --progress . "$TARGET_DIR" \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude 'backend/node_modules' \
    --exclude '.env' \
    --exclude 'backend/.env' \
    --exclude 'clone_template.sh' \
    --exclude 'brain' \
    --exclude '.gemini'

echo "Clone complete! Remember to:"
echo "1. Run 'npm install' in the root and 'backend' directories."
echo "2. Create '.env' files based on '.env.example'."
echo "3. Update package.json name fields."
