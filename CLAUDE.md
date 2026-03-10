# Minibar-Web — Claude Code Instructions

## Project
Medieval tavern management browser game. Player serves drinks by clicking tap → clicking customer.

Notion hub: https://www.notion.so/Minibar-Web-31f06e65f5fa80c3a6f1df12f3b9960d
AI Dev Guide: https://www.notion.so/31f06e65f5fa81bf83ccf196896e841e
Web Tickets DB: https://www.notion.so/ff0f7295e7c047e999fb2e063aaf9411

## Stack
- React + TypeScript (strict mode, no `any`)
- PixiJS v8 — all gameplay rendering (canvas)
- Zustand + persist middleware — localStorage state
- Vite — build tool

## Architecture
- 4 screens: `MAIN_MENU` | `DAY_IN_PROGRESS` | `BETWEEN_DAY_SHOP` | `GAME_OVER`
- App.tsx routes between screens via Zustand `screen` state
- PixiJS canvas lives inside DayScreen only
- React handles all UI: menus, HUD overlays, shop, game over
- Game loop: requestAnimationFrame with fixed timestep (60 ticks/s)

## Gameplay Constants
- Day: 120s fixed. Phases: Morning 0-30s, Afternoon 30-60s, Evening 60-90s, Night 90-120s
- Last Orders: 100s. Start drinks: lager + ale. Unlock 1 every 3 days (6 total in V1).
- Bar capacity: 13 seats. Star rating game over: below 1.0
- Canvas logical resolution: 375×667, CSS-scaled with letterboxing

## Project Structure
```
src/
  screens/      # MainMenuScreen, DayScreen, ShopScreen, GameOverScreen
  engine/
    systems/    # Customer spawning, patience, serving systems
    events/     # Typed event dispatcher
    renderer/   # PixiJS scene management, sprite factories
  entities/     # Customer entity model
  config/       # Static game data (drinks, customers, upgrades, difficulty)
  store/        # Zustand store (gameStore.ts), GameSave model
  components/   # React UI components (HUD, patience bar, etc.)
  audio/        # Howler.js audio manager (V1.5+)
  assets/       # Sprite sheets, fonts
  types/        # TypeScript types and interfaces
```

## Conventions
- Code comments reference ticket IDs: `// MBW-47: Description`
- All balance values in `src/config/`, never hardcoded in logic
- Placeholder coloured rectangles/shapes until real sprite assets are ready
- TypeScript strict mode — no `any` types
- Use PixiJS imperative API for game entities; React for UI chrome only
- Follow ticket sequence — each ticket's Notes field has context on what to build

## Current Version
Building V1.0 MVP. Check Release Plan before implementing any feature to confirm version.
