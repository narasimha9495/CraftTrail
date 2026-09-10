#!/usr/bin/env bash
# build.sh — Render build script for CraftTrail RAG service
# Installs dependencies and rebuilds the ChromaDB vector index

set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Building ChromaDB knowledge index ==="
python ingest.py

echo "=== Build complete ==="
