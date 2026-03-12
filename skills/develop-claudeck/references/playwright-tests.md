# Playwright MCP Test Patterns for ClauDeck

Detailed browser testing patterns for each ClauDeck screen using the Playwright MCP tools.

## General Setup

Before any UI test:

```
1. Ensure daemon is running: bun run start (or bun run dev:daemon)
2. Note the daemon URL (default: http://localhost:3847)
3. Get the auth token from ~/.claudeck/config.json
4. browser_navigate to the daemon URL
```

## Screen: ConnectScreen

**What to test:** First-time connection flow.

```
1. browser_navigate → http://localhost:3847
2. browser_snapshot → verify "Connect to your dev machine" heading exists
3. browser_take_screenshot → verify dark theme, centered form
4. browser_fill_form:
   - Host field: "localhost:3847"
   - Token field: (read from ~/.claudeck/config.json)
5. browser_click → "Connect" button
6. browser_snapshot → verify redirect to Projects screen
7. browser_take_screenshot → verify projects loaded
```

**Error case:**
```
1. browser_fill_form with wrong token
2. browser_click → "Connect"
3. browser_snapshot → verify error message appears
```

## Screen: ProjectsScreen

**What to test:** Project listing after connection.

```
1. (After successful connection)
2. browser_snapshot → verify project names from ~/.claude/projects/
3. browser_take_screenshot → verify grid/list layout, dark theme
4. browser_evaluate:
   - document.querySelectorAll('button').forEach(b => console.log(b.offsetHeight))
   - Verify all buttons >= 44px height (touch targets)
5. browser_click → first project in list
6. browser_snapshot → verify navigation to ProjectScreen
```

## Screen: ProjectScreen

**What to test:** Project view with session launcher.

```
1. browser_snapshot → verify project name and path displayed
2. browser_snapshot → check for "Active Session" card (if session running)
3. browser_take_screenshot → verify layout
4. browser_fill_form → type a prompt in the textarea
5. browser_click → "Start Session" button
6. browser_snapshot → verify navigation to SessionScreen
```

**Active session display:**
```
1. Start a session via API first: POST /api/sessions
2. browser_navigate → project page
3. browser_snapshot → verify "Active Session" card shows prompt text
4. browser_click → active session card
5. browser_snapshot → verify navigation to SessionScreen
```

## Screen: SessionScreen

**What to test:** Live output streaming, stop functionality.

```
1. (After starting a session)
2. Wait 2-3 seconds for output to stream
3. browser_snapshot → verify output content appearing
4. browser_take_screenshot → verify:
   - Header with prompt text and "Running..." status
   - Stop button (red) visible
   - Output area with streamed content
   - Auto-scroll working (content at bottom visible)
5. browser_click → "Stop" button
6. browser_snapshot → verify "Ended" status appears
7. browser_take_screenshot → verify Stop button disappears
```

**Auto-scroll test:**
```
1. Wait for significant output to stream
2. browser_evaluate:
   - const el = document.querySelector('[class*="overflow-y-auto"]')
   - const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
   - return atBottom  // should be true
3. Scroll up manually: browser_evaluate → el.scrollTop = 0
4. Wait for more output
5. Verify scroll position didn't jump back (scroll-lock engaged)
6. browser_click → "Scroll to bottom" button
7. Verify scrolled back to bottom
```

## Screen: ConnectionBanner

**What to test:** Reconnection behavior.

```
1. Stop the daemon (kill the process)
2. browser_snapshot → verify "Disconnected" banner appears (red)
3. browser_take_screenshot → verify banner at top
4. Restart the daemon
5. Wait for reconnection (exponential backoff: 1s, 2s, 4s...)
6. browser_snapshot → verify banner shows "Reconnecting..." then disappears
```

## Screen: BottomNav

**What to test:** Navigation between screens.

```
1. Start a session first
2. browser_snapshot → verify "Projects" and "Session" tabs in bottom nav
3. browser_click → "Projects" tab
4. browser_snapshot → verify on ProjectsScreen
5. browser_click → "Session" tab
6. browser_snapshot → verify back on SessionScreen with same session
```

## Touch Target Verification

Run this check on every screen:

```javascript
// browser_evaluate with this script:
const buttons = document.querySelectorAll('button, [role="button"], a');
const violations = [];
buttons.forEach(el => {
  const rect = el.getBoundingClientRect();
  if (rect.height < 44 || rect.width < 44) {
    violations.push({
      text: el.textContent?.trim().slice(0, 30),
      width: rect.width,
      height: rect.height
    });
  }
});
return JSON.stringify(violations);
// Expected: empty array []
```

## PWA Install Verification

```
1. browser_navigate → http://localhost:3847
2. browser_evaluate:
   - return document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content
   - Expected: "yes"
3. browser_evaluate:
   - const link = document.querySelector('link[rel="manifest"]')
   - const res = await fetch(link.href)
   - return await res.json()
   - Expected: manifest with display: "standalone", correct icons
```

## Dark Theme Verification

Take a screenshot and visually inspect:
- Background should be dark (#0f172a / slate-900)
- Text should be light (slate-100/200)
- Accent color blue (#3b82f6) for interactive elements
- No white flashes or unstyled content
- Code blocks should have syntax highlighting on dark background

## Console Error Check

After every navigation and interaction:

```
1. browser_console_messages
2. Filter for errors
3. Any new errors → fix before proceeding
4. Treat console errors as test failures
```
