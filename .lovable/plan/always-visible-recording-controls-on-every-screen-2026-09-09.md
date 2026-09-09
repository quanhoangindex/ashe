# Always-visible recording controls on every screen

## Goal
Make Ashe’s compact recording controls appear in the bottom-right corner of every connected monitor while recording, stay above other applications and websites, and remain reopenable after being closed.

## Changes
- Replace the single floating window with one floating control window per connected display.
- Position each panel within that display’s usable bottom-right area, avoiding the taskbar or dock.
- Create, reposition, or remove panels automatically when monitors are connected, disconnected, or their resolution changes.
- Keep every panel synchronized with the current recording status, timer, zoom level, and live preview.
- Route actions from any panel—pause, resume, stop, zoom, collapse, and close—back to the active recording.
- Preserve always-on-top, all-workspaces, fullscreen visibility, taskbar hiding, and capture exclusion where the operating system supports them.
- Add a tray command to restore floating controls across all displays after the user closes them.
- Correct desktop loading so both the main window and floating panels work in packaged builds, not only during local development.

## Validation
- Verify the web app still records normally without attempting unsupported cross-application floating windows.
- Verify a desktop production build compiles and loads its local files correctly.
- Exercise recording state transitions and display-change handling to confirm panels appear, update, close, and reopen correctly.

## Important limitation
A browser tab cannot place controls over other applications. This behavior will work in the installed Ashe desktop app; the website preview will keep its in-page controls only.

## Technical details
- Maintain a display-ID keyed map of Electron overlay windows instead of one global window.
- Use Electron display work areas and display lifecycle events for placement and synchronization.
- Broadcast overlay updates to every live overlay renderer and track readiness so initial state is not lost.
- Use the development server URL only during development; packaged builds load the bundled app with a relative Vite base and hash/query-safe overlay routing.
