#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=========================================================="
echo "AKTU Notes AI — Render Deployment Build Pipeline"
echo "=========================================================="

# 1. Upgrade pip
echo "==> Step 1: Upgrading pip..."
python -m pip install --upgrade pip

# 2. Install production dependencies
echo "==> Step 2: Installing requirements..."
pip install -r requirements.txt

# 3. Ensure persistent storage directories exist
echo "==> Step 3: Preparing persistent directories..."
mkdir -p storage/uploads storage/chroma

# 4. Run database migrations on NeonDB
echo "==> Step 4: Running Alembic database migrations on NeonDB..."
alembic upgrade head

echo "=========================================================="
echo "==> Build completed successfully!"
echo "=========================================================="

