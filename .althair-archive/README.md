# Velmeir

AI-powered personal life operating system.

## Overview

Velmeir combines a calm workspace, AI command bar, tasks, calendar, goals, habits, notes, memory, and mind maps.

## Tech Stack

- React + Vite
- Tailwind CSS
- Framer Motion
- React Router
- Express
- Supabase
- Ollama local AI
- React Flow

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in your Supabase project values.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development:
   ```bash
   npm run dev
   ```

## Notes

- The frontend proxies `/api` requests to the Express server on port `4000`.
- The AI assistant uses local Ollama via `http://localhost:11434`.
- The memory layer is implemented with Supabase memories and future-friendly retrieval.
