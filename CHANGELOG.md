# Changelog

## 1.0.2 - UX Improvements and Polish

### Fixed
- **3.5 Mode XP Split**: Now follows the correct XP splitting logic for 3.5 D&D

### Improved
- **XP Bar Responsiveness**: XP bar now shows/hides instantly when toggled in settings (no reload required)
- **Cleaner Console Output**: Removed debug logging during normal operation to reduce console noise and bandwidth

### Enhanced
- **Decimal CR Interpolation**: Both XP award methods now support decimal CR values (e.g., CR 7.5) with linear interpolation
- **Epic Level Support**: Extended support for levels 1-40 with proper XP calculations

## 1.0.1 - Bug Fixes and Formula Improvements

### Fixed
- **Fractional CR Support**: Now correctly handles fractional CR creatures (CR 1/2, 1/4, 1/8, etc.) for swarms and weak monsters
- **Token-Based Enemy Tracking**: Fixed issue where enemies were tracked by actor ID instead of token ID, preventing unlinked token enemies from being added separately
- **Adjusted CR Handling**: Corrected CR calculation to use totalCr field for creatures with adjusted CR values
- **XP Bar Drag**: Fixed issue where XP bar stopped being draggable after gaining XP (event listeners now properly re-attach on re-render)

### Improved
- **Party Level Calculation**: Updated to use power-based formula (2^(level/2) ÷ 4) for more accurate difficulty assessment with non-standard party sizes
- **XP Formula Accuracy**: Completely rewritten `awardRaw35()` to match official d20srd.org XP table values with special cases for even/odd ELs
- **UI Tooltips**: Enhanced explanations of party level vs average level calculations
- **Fractional CR Display**: Now displays fractional CRs using Unicode fraction characters (¼, ½, ⅛, etc.) for better readability

### Documentation
- Added XP method comparison guide explaining differences between 3.5e, 3.0e, and the SRD calculator method
- Clarified that module follows official DMG rules, not SRD calculator methods

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
