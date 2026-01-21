---
name: agent-browser
description: Automates browser interactions for web testing, form filling, screenshots, and data extraction. Use when the user needs to navigate websites, interact with web pages, fill forms, take screenshots, test web applications, or extract information from web pages.
allowed-tools: Bash(bunx agent-browser:*)
---

# Browser Automation with agent-browser

## Quick start

```bash
bunx agent-browser open <url>        # Navigate to page
bunx agent-browser snapshot -i       # Get interactive elements with refs
bunx agent-browser click @e1         # Click element by ref
bunx agent-browser fill @e2 "text"   # Fill input by ref
bunx agent-browser close             # Close browser
```

## Core workflow

1. Navigate: `bunx agent-browser open <url>`
2. Snapshot: `bunx agent-browser snapshot -i` (returns elements with refs like `@e1`, `@e2`)
3. Interact using refs from the snapshot
4. Re-snapshot after navigation or significant DOM changes

## Commands

### Navigation
```bash
bunx agent-browser open <url>      # Navigate to URL
bunx agent-browser back            # Go back
bunx agent-browser forward         # Go forward
bunx agent-browser reload          # Reload page
bunx agent-browser close           # Close browser
```

### Snapshot (page analysis)
```bash
bunx agent-browser snapshot            # Full accessibility tree
bunx agent-browser snapshot -i         # Interactive elements only (recommended)
bunx agent-browser snapshot -c         # Compact output
bunx agent-browser snapshot -d 3       # Limit depth to 3
bunx agent-browser snapshot -s "#main" # Scope to CSS selector
```

### Interactions (use @refs from snapshot)
```bash
bunx agent-browser click @e1           # Click
bunx agent-browser dblclick @e1        # Double-click
bunx agent-browser focus @e1           # Focus element
bunx agent-browser fill @e2 "text"     # Clear and type
bunx agent-browser type @e2 "text"     # Type without clearing
bunx agent-browser press Enter         # Press key
bunx agent-browser press Control+a     # Key combination
bunx agent-browser keydown Shift       # Hold key down
bunx agent-browser keyup Shift         # Release key
bunx agent-browser hover @e1           # Hover
bunx agent-browser check @e1           # Check checkbox
bunx agent-browser uncheck @e1         # Uncheck checkbox
bunx agent-browser select @e1 "value"  # Select dropdown
bunx agent-browser scroll down 500     # Scroll page
bunx agent-browser scrollintoview @e1  # Scroll element into view
bunx agent-browser drag @e1 @e2        # Drag and drop
bunx agent-browser upload @e1 file.pdf # Upload files
```

### Get information
```bash
bunx agent-browser get text @e1        # Get element text
bunx agent-browser get html @e1        # Get innerHTML
bunx agent-browser get value @e1       # Get input value
bunx agent-browser get attr @e1 href   # Get attribute
bunx agent-browser get title           # Get page title
bunx agent-browser get url             # Get current URL
bunx agent-browser get count ".item"   # Count matching elements
bunx agent-browser get box @e1         # Get bounding box
```

### Check state
```bash
bunx agent-browser is visible @e1      # Check if visible
bunx agent-browser is enabled @e1      # Check if enabled
bunx agent-browser is checked @e1      # Check if checked
```

### Screenshots & PDF
```bash
bunx agent-browser screenshot          # Screenshot to stdout
bunx agent-browser screenshot path.png # Save to file
bunx agent-browser screenshot --full   # Full page
bunx agent-browser pdf output.pdf      # Save as PDF
```

### Video recording
```bash
bunx agent-browser record start ./demo.webm    # Start recording (uses current URL + state)
bunx agent-browser click @e1                   # Perform actions
bunx agent-browser record stop                 # Stop and save video
bunx agent-browser record restart ./take2.webm # Stop current + start new recording
```
Recording creates a fresh context but preserves cookies/storage from your session. If no URL is provided, it automatically returns to your current page. For smooth demos, explore first, then start recording.

### Wait
```bash
bunx agent-browser wait @e1                     # Wait for element
bunx agent-browser wait 2000                    # Wait milliseconds
bunx agent-browser wait --text "Success"        # Wait for text
bunx agent-browser wait --url "**/dashboard"    # Wait for URL pattern
bunx agent-browser wait --load networkidle      # Wait for network idle
bunx agent-browser wait --fn "window.ready"     # Wait for JS condition
```

### Mouse control
```bash
bunx agent-browser mouse move 100 200      # Move mouse
bunx agent-browser mouse down left         # Press button
bunx agent-browser mouse up left           # Release button
bunx agent-browser mouse wheel 100         # Scroll wheel
```

### Semantic locators (alternative to refs)
```bash
bunx agent-browser find role button click --name "Submit"
bunx agent-browser find text "Sign In" click
bunx agent-browser find label "Email" fill "user@test.com"
bunx agent-browser find first ".item" click
bunx agent-browser find nth 2 "a" text
```

### Browser settings
```bash
bunx agent-browser set viewport 1920 1080      # Set viewport size
bunx agent-browser set device "iPhone 14"      # Emulate device
bunx agent-browser set geo 37.7749 -122.4194   # Set geolocation
bunx agent-browser set offline on              # Toggle offline mode
bunx agent-browser set headers '{"X-Key":"v"}' # Extra HTTP headers
bunx agent-browser set credentials user pass   # HTTP basic auth
bunx agent-browser set media dark              # Emulate color scheme
```

### Cookies & Storage
```bash
bunx agent-browser cookies                     # Get all cookies
bunx agent-browser cookies set name value      # Set cookie
bunx agent-browser cookies clear               # Clear cookies
bunx agent-browser storage local               # Get all localStorage
bunx agent-browser storage local key           # Get specific key
bunx agent-browser storage local set k v       # Set value
bunx agent-browser storage local clear         # Clear all
```

### Network
```bash
bunx agent-browser network route <url>              # Intercept requests
bunx agent-browser network route <url> --abort      # Block requests
bunx agent-browser network route <url> --body '{}'  # Mock response
bunx agent-browser network unroute [url]            # Remove routes
bunx agent-browser network requests                 # View tracked requests
bunx agent-browser network requests --filter api    # Filter requests
```

### Tabs & Windows
```bash
bunx agent-browser tab                 # List tabs
bunx agent-browser tab new [url]       # New tab
bunx agent-browser tab 2               # Switch to tab
bunx agent-browser tab close           # Close tab
bunx agent-browser window new          # New window
```

### Frames
```bash
bunx agent-browser frame "#iframe"     # Switch to iframe
bunx agent-browser frame main          # Back to main frame
```

### Dialogs
```bash
bunx agent-browser dialog accept [text]  # Accept dialog
bunx agent-browser dialog dismiss        # Dismiss dialog
```

### JavaScript
```bash
bunx agent-browser eval "document.title"   # Run JavaScript
```

## Example: Form submission

```bash
bunx agent-browser open https://example.com/form
bunx agent-browser snapshot -i
# Output shows: textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Submit" [ref=e3]

bunx agent-browser fill @e1 "user@example.com"
bunx agent-browser fill @e2 "password123"
bunx agent-browser click @e3
bunx agent-browser wait --load networkidle
bunx agent-browser snapshot -i  # Check result
```

## Example: Authentication with saved state

```bash
# Login once
bunx agent-browser open https://app.example.com/login
bunx agent-browser snapshot -i
bunx agent-browser fill @e1 "username"
bunx agent-browser fill @e2 "password"
bunx agent-browser click @e3
bunx agent-browser wait --url "**/dashboard"
bunx agent-browser state save auth.json

# Later sessions: load saved state
bunx agent-browser state load auth.json
bunx agent-browser open https://app.example.com/dashboard
```

## Sessions (parallel browsers)

```bash
bunx agent-browser --session test1 open site-a.com
bunx agent-browser --session test2 open site-b.com
bunx agent-browser session list
```

## JSON output (for parsing)

Add `--json` for machine-readable output:
```bash
bunx agent-browser snapshot -i --json
bunx agent-browser get text @e1 --json
```

## Debugging

```bash
bunx agent-browser open example.com --headed              # Show browser window
bunx agent-browser console                                # View console messages
bunx agent-browser errors                                 # View page errors
bunx agent-browser record start ./debug.webm   # Record from current page
bunx agent-browser record stop                            # Save recording
bunx agent-browser open example.com --headed  # Show browser window
bunx agent-browser --cdp 9222 snapshot        # Connect via CDP
bunx agent-browser console                    # View console messages
bunx agent-browser console --clear            # Clear console
bunx agent-browser errors                     # View page errors
bunx agent-browser errors --clear             # Clear errors
bunx agent-browser highlight @e1              # Highlight element
bunx agent-browser trace start                # Start recording trace
bunx agent-browser trace stop trace.zip       # Stop and save trace
```
