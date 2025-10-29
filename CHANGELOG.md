# Changelog

## 1.0.0 - Initial Release

### Features
- **XP Calculator App**: GM-side encounter calculator with D&D 3.5e encounter level calculations
- **XP Bar App**: Player-side XP bar showing current/next level progress and requirements
- **Two Award Modes**:
  - **RAW 3.5e (per-PC)**: Default mode with per-character XP awards
  - **Classic 3.0 (split pot)** XP is split among group members
- **Party Management**: Add/remove party members, track levels and XP
- **Enemy Management**: Add/remove enemies, set CR and count for encounter building
- **Encounter Level Calculation**: Real-time EL calculation following D&D 3.5e DMG guidelines
- **Party Size Adjustment**: Difficulty estimation (displayed with tooltip explaining it doesn't affect XP calculation)
- **Manual XP Awards**: Award XP in points or segments ("bubbles") with custom reasons shown in chat
- **Rollback Feature**: Undo the last XP award with one click
- **Double-Click Integration**: Double-click party/enemy rows to open character sheets
- **Scene Token Import**: Import hostile, neutral, and friendly tokens from current scene
- **Settings**: Configurable XP bar visibility and encounter calculator options
- **Detailed EL Breakdown**: Toggle to show/hide step-by-step encounter difficulty calculations

### Interface
- Clean, modern UI with hover effects and visual feedback
- Responsive design that works with Foundry VTT themes
- Consistent terminology and clear instructions
- Real-time updates when settings change

### Technical
- TypeScript + Vite build system
- Handlebars templates for dynamic UI
- CSS styling with Foundry VTT integration
- MIT License

## 0.1.0 - Initial Scaffold
- Project structure and basic setup
