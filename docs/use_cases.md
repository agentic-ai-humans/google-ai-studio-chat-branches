# Google AI Studio Chat Branches Extension - User Guide

## **When the Extension Won't Work**

### **Wrong Website**
If you're on any website other than Google AI Studio, you'll see:
> "This plugin works on AI Studio chat pages. Please open a specific chat to use this extension."

### **New Chat Page**
If you're on the "new chat" page (before starting a conversation), you'll see the same message. The extension needs an actual chat with messages to work.

---

## **When You Haven't Run Analysis Yet**

### **First Time Using the Extension**
When you open the extension on a chat that hasn't been analyzed yet, you'll see:
- **"Scroll to Bottom"** button - Click this first to make sure you're at the latest message
- **"New Analysis"** button - Click this to analyze your chat history
- A helpful tip explaining the file export process (no input length limits!)

**What happens when you click "New Analysis":**
1. The extension scrolls through your entire chat
2. It creates a special prompt for the AI to analyze your conversation
3. **The prompt gets exported to a downloadable file** (bypasses input length limits!)
4. You attach the downloaded file to your message and press Send
5. The AI responds with a breakdown of your conversation topics

---

## **After You've Run Analysis**

### **All Features Available**
Once the AI has analyzed your chat, you'll see the full extension with all these tools:

**Conversation Branches:**
- **Branch dropdown** - Shows all the different branches in your conversation
  - **Sorting**: Most recent activity first, then alphabetical
  - **Format**: "Branch Name (X messages)" with message counts
- **"Go to branch"** - Jumps to messages from that branch (with progress overlay if search is needed)
- **"Copy branch"** - Copies the main conversation up to the fork point, then all messages from the selected branch in chronological order (with progress overlay showing copy steps)

**Visualization Tools:**
- **"Export JSON"** - Downloads the raw data structure as a file
- **"Export Mermaid"** - Downloads the diagram code as a file
- **"Show Graph"** - Opens an interactive visual map of your conversation flow

**Analysis Tools:**
- **"New Analysis"** - Run a fresh analysis (updates everything)
- **"Scroll to Bottom"** - Quick way to get to your latest messages

### **When You Can't See Your Analysis**
Sometimes you might scroll away from where the AI put its analysis. If this happens:
- The extension still works! All buttons remain functional
- You might see a **"Find Analysis"** button to jump back to the analysis
- Or just use **"New Analysis"** to create a fresh one

---

## **Common Situations**

### **Multiple Analyses in One Chat**
If you've run the analysis multiple times in the same chat:
- The extension automatically uses the **newest analysis**
- Older analyses are ignored
- All features work normally with the latest data

### **Mixed JSON and Mermaid Content**
Sometimes the AI puts both JSON data and Mermaid diagram in one code block:
- **Extension checks:** Separate blocks or combined? 
- **If combined:** Splits them automatically and proceeds normally
- **Result:** All features work exactly the same
- **No user action needed**

**That's it!** Simple split-and-proceed logic handles this edge case transparently.

### **If Something Goes Wrong**
Sometimes the analysis might get corrupted or deleted:
- **Don't worry!** The extension remembers your data
- Most features will still work from memory
- If you see "Analysis data is corrupted," just run a **"New Analysis"**

---

## **How to Use the Main Features**

### **Copying a Branch**
1. **Select a branch** from the dropdown (e.g., "Bug Fixes", "Feature Ideas")
2. **Click "Copy branch"** - Shows progress overlay while preparing the branch export
3. **Wait for completion** - Progress overlay shows steps: preparing, collecting, scrolling, processing, formatting, and exporting
4. **File download** - A timestamped file is automatically downloaded with the branch content
5. **Open a new chat** and attach the file - Now you have the full context plus the focused discussion!

**Why this is useful:**
- Get complete context for a specific discussion thread
- Share coherent conversation flows with proper background
- Continue discussions with all necessary context preserved

### **Navigating Your Chat**
1. **Select a branch** from the dropdown
2. **Click "Go to branch"** - First tries to jump directly to the branch messages if visible in current view
3. **If not immediately visible** - Shows progress overlay "Searching for branch messages..." while carefully navigating through chat history
4. **When found** - Jumps to where that branch starts and highlights the messages with yellow background for 2 seconds

**Perfect for:**
- Finding where you discussed something specific
- Reviewing different parts of long conversations
- Jumping between branches quickly

### **Creating Visual Maps**
1. **Click "Show Graph"** - Opens an interactive diagram
2. See your conversation as a branching tree
3. Explore how topics connect and flow

**Great for:**
- Understanding complex conversations
- Presenting conversation structure
- Finding patterns in your discussions

---

## **What If Something Goes Wrong?**

### **"Could not find the analysis"**
**What happened:** The analysis message was deleted from your chat
**What to do:** Click **"New Analysis"** to create a fresh one

### **"Analysis data is corrupted"**
**What happened:** The analysis exists but got messed up somehow
**What to do:** Click **"New Analysis"** to fix it

### **"No content to analyze"**
**What happened:** Your chat is empty or only has AI "thinking" messages
**What to do:** Have some actual conversation first, then try analysis

### **File Downloads**
When you export a branch, the file automatically downloads to your default download folder.
Just attach the downloaded file to a new chat to continue that specific discussion!

---

## **Why the Extension Remembers Your Data**

### **Smart Memory System**
The extension automatically saves your analysis results so they work even if:
- You scroll away from the analysis
- You refresh the browser
- The analysis message gets deleted
- You switch between different chats

### **What This Means for You**
- **All buttons always work** - No more "analysis not found" errors
- **Faster loading** - No need to re-scan your chat every time
- **Reliable experience** - The extension just works, consistently

### **When Memory Gets Updated**
- Every time you run **"New Analysis"** - Fresh data overwrites old data
- When the extension finds analysis in your chat - Automatically saves it
- **Simple rule:** Newest analysis always wins

---

## **Summary of UI States:**

| Condition | Main View | Find Analysis | Branch Tools | Mermaid Tools |
|-----------|-----------|---------------|--------------|---------------|
| Wrong domain | No (shows error) | No | No | No |
| New chat | No (shows error) | No | No | No |
| Valid chat, no analysis | Yes Basic | No | No | No |
| Analysis visible | Yes Full | No | Yes | Yes |
| Analysis hidden | Yes Full | Yes | Yes | Yes |
| Analysis corrupted | Yes Basic | Yes | No | No |

This covers all the major use cases and edge cases for the extension!

---

# Technical Use Cases Reference

## **UI State Breakdown by Scenario**

### **UC-01: Wrong Domain**
**Conditions:**
- User on non-AI Studio website
- OR user on `aistudio.google.com` but not on `/prompts/[chatId]` URL

**UI Elements Shown:**
- `incorrectDomainView` (visible)
- `mainView` (hidden)
- Error message: *"This plugin works on AI Studio chat pages with URLs like: https://aistudio.google.com/prompts/[CHAT_ID]. Please open or create a specific chat to use this extension."*

**UI Elements Hidden:**
- All main functionality
- All buttons except basic popup structure

---

### **UC-02: New Chat Page**
**Conditions:**
- URL: `https://aistudio.google.com/prompts/new_chat` or `/prompts/new`
- `generateChatId()` returns `null`

**UI Elements Shown:**
- `incorrectDomainView` (visible) - same as UC-01
- Same error message as UC-01

**UI Elements Hidden:**
- All main functionality

---

### **UC-03: Valid Chat - No Analysis**
**Conditions:**
- Valid chat ID exists in URL
- No stored `analysis_turn_${chatId}` in storage
- No analysis found in current DOM

**UI Elements Shown:**
- `mainView` (visible)
- `mainControls` (visible)
  - `scrollToBottomButton` - "Scroll to Bottom" (blue)
  - `analyzeButton` - "New Analysis" (blue)
  - Tip text about scrolling first

**UI Elements Hidden:**
- `filteringView` (hidden)
- `mermaidSection` (hidden)
- Branch selector dropdown
- All analysis-dependent buttons

---

### **UC-04: Valid Chat - Analysis Visible**
**Conditions:**
- Valid chat ID exists
- Stored `analysis_turn_${chatId}` exists
- Analysis turn found in current DOM (`analysisTurnFound: true`)
- `getLatestAnalysisFromDom()` returns valid data

**UI Elements Shown:**
- `mainView` (visible)
- `mainControls` (visible)
  - `scrollToBottomButton` - "Scroll to Bottom" (blue)
  - `analyzeButton` - "New Analysis" (blue)
- `filteringView` (visible)
  - `branchSelector` - populated dropdown with sorted branches
    - **Primary sort**: Most recent activity (highest turn index) descending
    - **Secondary sort**: Alphabetical ascending for same recency
    - **Format**: "Branch Name (X message[s])" with message counts
  - `openBranchButton` - "Export branch to file" (blue)
  - `goToBranchButton` - "Go to branch" (teal #16a085)
- `mermaidSection` (visible)
  - `exportJsonButton` - "Export JSON" (orange #f39c12)
  - `exportMermaidButton` - "Export Mermaid" (purple #9b59b6)
  - `showGraphButton` - "Show Graph" (green #2ecc71)
  - Links to mermaid.live

**UI Elements Hidden:**
- None (full functionality available)

---

### **UC-05: Valid Chat - Analysis Hidden**
**Conditions:**
- Valid chat ID exists
- Stored `analysis_turn_${chatId}` exists
- Analysis turn NOT found in current DOM (`analysisTurnFound: false`)
- User scrolled away from analysis OR analysis not in current view

**UI Elements Shown:**
- Same as UC-04 (all functionality available due to caching)
  - `branchSelector` uses same sorting: most recent activity first, then alphabetical
  - Same format: "Branch Name (X message[s])" with message counts
- Additional: "Find Analysis" notification may appear

**Behavior:**
- All buttons work normally using cached data
- `getAnalysisData` returns `source: "cache"`

---

### **UC-06: Valid Chat - Analysis Corrupted**
**Conditions:**
- Valid chat ID exists
- Stored `analysis_turn_${chatId}` exists
- Analysis turn found in DOM but contains no valid JSON/Mermaid data
- Cache may or may not exist

**UI Elements Shown:**
- If cache available: Same as UC-04 (full functionality from cache)
- If no cache: Same as UC-03 (basic controls only)
- "Find Analysis" button may show corrupted data warning

**Behavior:**
- Extension attempts to use cached data first
- If cache unavailable, falls back to basic mode

---

### **UC-07: Multiple Analyses**
**Conditions:**
- Valid chat ID exists
- Multiple analysis responses in chat history
- `getLatestAnalysisFromDom()` finds newest analysis

**UI Elements Shown:**
- Same as UC-04 (uses latest analysis)

**Behavior:**
- Automatically uses most recent analysis
- Older analyses ignored
- Latest analysis data cached

---

### **UC-08: Analysis Operation in Progress**
**Conditions:**
- Valid chat ID exists
- User clicks "New Analysis" button
- `climbAndScrapeHistory()` operation is running
- Progress overlay is visible in main page
- **Popup is closed** (user sees progress overlay on main page)

**Main Page Behavior:**
- Progress overlay visible with analysis progress updates
- User can see "Scrolling through chat: X/Y messages" updates
- User cannot interact with extension until operation completes

**If User Reopens Popup During Operation:**
- Popup shows normal UI based on current analysis data
- All buttons appear enabled (popup doesn't know about active operation)
- **Challenge:** User can potentially trigger conflicting operations

---

### **UC-09: Go to Branch Operation in Progress**
**Conditions:**
- Valid chat ID exists with analysis data
- User selects branch and clicks "Go to branch"
- Navigation/search operation is running (if branch not immediately visible)
- **Popup is closed** (user sees progress overlay on main page if search needed)

**Main Page Behavior:**
- **Direct navigation:** If branch visible, immediate jump and highlight (no popup close)
- **Search needed:** Progress overlay showing "Searching for branch messages..."
- User can see "Searching through chat: X/Y messages processed" updates
- Operation completes with branch highlighting

**If User Reopens Popup During Search Operation:**
- Popup shows normal UI with same branch still selected
- All buttons appear enabled (popup doesn't track active search)
- **Challenge:** User can potentially trigger conflicting navigation

---

### **UC-10: Export Branch Operation in Progress**
**Conditions:**
- Valid chat ID exists with analysis data
- User selects branch and clicks "Export branch to file"
- Export operation is running with progress overlay
- **Popup is closed** (user sees progress overlay on main page)

**Main Page Behavior:**
- Progress overlay visible with detailed export progress updates
- User can see various export steps: "Preparing branch export...", "Collecting chat history...", "Processing messages...", "Creating file...", etc.
- Operation completes with file download and success alert
- User cannot interact with extension until operation completes

**If User Reopens Popup During Export Operation:**
- Popup shows normal UI with same branch still selected
- All buttons appear enabled (popup doesn't track active export operation)
- **Challenge:** User can potentially trigger conflicting export operations or other actions

---

### **UC-11: Popup Reopened During Active Operation**
**Conditions:**
- Any long-running operation is in progress (analysis, branch search, branch copy)
- Progress overlay is visible on main page
- User clicks extension icon to reopen popup
- Content script operation is still running

**Popup Initialization Behavior:**
1. **Progress Overlay Detection**: Popup sends `checkProgressOverlay` message to content script
2. **Content script responds** with current overlay state (`hasActiveOverlay: true/false`)
3. **If active operation detected:**
   - All buttons disabled (grayed out with opacity 0.5)
   - "Operation in Progress" message displayed
   - User sees: *"An operation is currently running. Please wait for it to complete."*
4. **If no active operation:**
   - Normal popup initialization with all buttons enabled

**UI Elements Shown (Active Operation):**
- `mainView` (visible) - Shows normal interface structure
- `filteringView` (visible if analysis data exists) - All controls disabled
- `mermaidSection` (visible if analysis data exists) - All buttons disabled
- **Operation status message** - Prominent notification about active operation
- All buttons grayed out and non-clickable

**UI Elements Shown (No Active Operation):**
- Normal popup behavior (UC-04, UC-05, etc.)
- All buttons enabled and functional

---

### **UC-12: Operation Interrupted (Crash/Refresh Recovery)**
**Conditions:**
- User was in middle of any operation (UC-08, UC-09, or UC-10)
- Page refreshed, script crashed, or browser closed/reopened
- Progress overlay was showing but operation never completed
- No completion callback was executed to re-enable buttons

**UI Elements Behavior on Next Popup Open:**
- Extension detects no active operation in progress
- **All buttons default to enabled state** (ignoring any previous disabled state)
- `mainView` - Shows appropriate state based on analysis data availability
- `filteringView` - Shows if analysis data exists (enabled)
- `mermaidSection` - Shows if analysis data exists (enabled)
- No progress overlay visible
- Normal functionality fully restored

**Recovery Logic:**
- Extension does NOT persist button disabled states across page reloads
- Each popup opening starts with fresh UI state evaluation
- Previous operation state is considered abandoned/completed
- User can immediately retry any operation if needed

---

### **UC-13: Page Refresh Detected (Popup Open)**
**Conditions:**
- Valid chat ID exists with cached analysis data
- **User opens extension popup** after page refresh
- Stored turn-ids don't exist in current DOM
- Analysis data exists but navigation would fail

**UI Elements Shown:**
- **Refresh detection popup** (modal overlay within extension popup)
- Message: *"Page was refreshed and chat IDs changed. Click 'Refresh Mappings' to update the analysis data."*
- **"Refresh Mappings" button** (primary action)
- **"Cancel" button** (dismiss, but navigation won't work)
- Background popup dimmed/disabled

**UI Elements Hidden:**
- Normal popup interface temporarily hidden behind refresh detection modal
- All navigation buttons inaccessible until refresh handled

**User Experience:**
- **Immediate detection**: User sees refresh popup as soon as they open extension
- **Clear explanation**: User understands what happened and why
- **Simple solution**: One button click to fix everything
- **Proactive handling**: Issue resolved before user tries to navigate

---

## **User Action Flows**

### **UF-01: New Analysis Flow**
**Trigger:** User clicks `analyzeButton`
**Steps:**
1. **Popup closes immediately** - User sees main AI Studio page
2. `showProgressOverlay()` displays center overlay on main page
3. `climbAndScrapeHistory()` scrolls through chat
4. Progress updates: "Scrolling through chat: X/Y messages"
5. `exportPromptToFile()` creates and downloads analysis prompt file
6. `hideProgressOverlay()` after 5 seconds with file export completion message
7. User manually attaches downloaded file and clicks Send in AI Studio
8. AI responds with analysis
9. **If user reopens popup during operation:** UC-11 (potential conflicts)
10. **After operation completes:** Next popup open → UC-04 or UC-05

---

### **UF-02: Go to Branch Flow**
**Trigger:** User selects branch + clicks `goToBranchButton`
**Steps:**
1. `goToBranch(branchName)` called
2. Try `getLatestAnalysisFromDom()` first
3. If not found, use cached `branchMap`
4. **Refresh Detection:** Check if stored turn-ids exist in current DOM
5. **If turn-ids exist:** Use direct DOM search with `document.getElementById(turnId)`
6. **If turn-ids don't exist (page refreshed):**
   - Show popup message: *"Page was refreshed and chat IDs changed. Click 'Refresh Mappings' to update the analysis data."*
   - User clicks "Refresh Mappings" button
   - **Trigger UF-01**: Run analysis operation to regenerate mappings
   - **No new chat message**: Just updates internal JSON mapping
7. **Direct DOM Search:** Try to find turn element using current turn-ids
8. **If found directly:** 
   - Jump to turn immediately, highlight with yellow background for 2 seconds
   - **Popup remains open** (no long operation needed)
9. **If not found in current DOM:** 
   - **Popup closes immediately** - User sees main AI Studio page
   - Show progress overlay: "Searching for branch messages..."
10. **Careful Navigation:** Step by step scroll from bottom to top through chat history
11. **Progress Updates:** "Searching through chat: X/Y messages processed"
12. **When target found:** Hide progress overlay, `scrollIntoView()` to target turn
13. Highlight with yellow background for 2 seconds
14. **If user reopens popup during search:** UC-11 (potential conflicts)

---

### **UF-03: Export Branch Flow**
**Trigger:** User selects branch + clicks `openBranchButton`
**Steps:**
1. `openFilteredBranch(branchName)` called
2. **Popup closes immediately** - User sees main AI Studio page
3. **Show progress overlay:** "Exporting branch history..."
4. **Progress Updates:** "Preparing branch export..." (10%)
5. Get analysis data (DOM or cache)
6. **Progress Updates:** "Collecting chat history..." (20%)
7. `climbAndScrapeHistory()` to collect all messages
8. **Progress Updates:** "Scrolling through chat: X/Y messages" (20-70%)
9. **Progress Updates:** "Processing messages..." (75%)
10. Filter messages by branch using `branchMap`
11. **Progress Updates:** "Formatting branch content..." (85%)
12. Format as markdown with context
13. **Progress Updates:** "Creating file..." (95%)
14. `exportBranchToFile()` creates and downloads timestamped file
15. **Hide progress overlay**
16. **If user reopens popup during operation:** UC-11 (potential conflicts)

---

### **UF-04: Show Graph Flow**
**Trigger:** User clicks `showGraphButton`
**Steps:**
1. Check `currentAnalysisData?.mermaidData`
2. `createMermaidLiveUrl()` with compression
3. `chrome.tabs.create()` opens new tab
4. Fallback: Export Mermaid file and open mermaid.live for manual import

---

### **UF-05: Export JSON/Mermaid Flow**
**Trigger:** User clicks `exportJsonButton` or `exportMermaidButton`
**Steps:**
1. Check `currentAnalysisData?.jsonData` or `mermaidData`
2. `exportDataToFile()` creates timestamped file with appropriate extension (.json or .mmd)
3. File automatically downloads with structured data

---

### **UF-06: Popup Reopened During Operation Flow**
**Trigger:** User reopens popup while content script operation is running
**Steps:**
1. **Popup initialization begins** - Normal DOM element references loaded
2. **Progress overlay check** - Send `{ action: 'checkProgressOverlay' }` to content script
3. **Content script response** - Returns `{ hasActiveOverlay: true/false }`
4. **If active operation detected (`hasActiveOverlay: true`):**
   - Call `disableAllButtons()` - All buttons grayed out with opacity 0.5
   - Show operation status message: *"An operation is currently running. Please wait for it to complete."*
   - Hide normal analysis data loading
5. **If no active operation (`hasActiveOverlay: false`):**
   - Continue with normal popup initialization (loadAnalysisData, etc.)
   - Call `enableAllButtons()` - Normal functionality available
6. **User sees appropriate UI state** - Either disabled with message or fully functional

**Key Benefits:**
- Prevents conflicting operations
- Clear user feedback about system state
- Leverages existing progress overlay infrastructure
- Simple implementation with minimal code changes

---

## **Exception Flows**

### **EF-01: Analysis Not Found**
**Trigger:** User clicks "Find Analysis" but `analysis_turn_${chatId}` doesn't exist in DOM
**Response:** Alert: *"Could not find the analysis. It may have been deleted."*
**Resolution:** User must run new analysis

---

### **EF-02: Analysis Corrupted**
**Trigger:** Analysis exists but `extractJsonAndMermaidFromDom()` returns no valid data
**Response:** Alert: *"Analysis data is corrupted, please run new analysis"*
**Resolution:** User must run new analysis

---

### **EF-03: Empty Chat**
**Trigger:** User clicks "New Analysis" but `climbAndScrapeHistory()` finds no content
**Response:** Alert: *"Could not find any content to analyze. Please ensure the chat is not empty."*
**Resolution:** User must add content to chat

---

### **EF-04: Combined Block Handling**
**Trigger:** AI returns JSON+Mermaid in single code block
**Processing:** 
1. Check if JSON block contains ````mermaid` 
2. If yes: Split using regex, extract both parts
3. If no: Process normally
4. Continue with standard logic
**User Impact:** Transparent - all features work normally

---

### **EF-05: Cache Fallback**
**Trigger:** `getLatestAnalysisFromDom()` returns null but cache exists
**Processing:** `getAnalysisFromCache()` provides fallback data
**Response:** `source: "cache"` in data response
**Log:** `"Loaded analysis from cache: turn-XXXXX"`
**User Impact:** All features work normally

---

### **EF-06: Branch Export Success**
**Trigger:** Successful branch export operation
**Response:** File download completes automatically (no alert needed)
**Type:** Silent success (user sees file download)

---

### **EF-07: Operation Interruption Recovery**
**Trigger:** User opens popup after page refresh/crash during any operation (analysis, go to branch, export branch)
**Detection:** No active progress overlay, no operation completion flags set
**Processing:** Extension initializes with fresh state, ignoring any previous operation state
**Response:** Normal UI with all buttons enabled based on current analysis data availability
**Log:** `"Popup initialized - no active operations detected"`
**User Impact:** Can immediately use all available features, previous operation considered abandoned

---

### **EF-08: Popup Reopened During Active Operation**
**Trigger:** User reopens popup while content script operation is running (analysis, branch search, branch copy)
**Detection:** Popup sends `checkProgressOverlay` message to content script on initialization
**Processing:** 
1. Content script checks for existing progress overlay in DOM
2. Responds with `{ hasActiveOverlay: true/false }`
3. Popup disables all buttons if active operation detected
**Response:** 
- **Active operation found**: All buttons disabled, "Operation in Progress" message shown
- **No active operation**: Normal popup initialization
**User Impact:** **RISK MITIGATED** - Users cannot trigger conflicting operations, clear feedback provided
**Implementation:** Simple DOM check leveraging existing progress overlay infrastructure

---

### **EF-09: Multiple Rapid Operations**
**Trigger:** User clicks multiple buttons rapidly or triggers operations while others are running
**Detection:** Multiple content script operations attempting to run simultaneously
**Processing:** Depends on operation type - some may conflict, others may queue
**Response:** Unpredictable behavior - operations may fail, interfere, or complete unexpectedly
**User Impact:** Potential errors, incomplete operations, or system instability

---

### **EF-10: Page Refresh Detection**
**Trigger:** User opens extension popup after page refresh
**Detection Point:** **Popup initialization** - Extension checks cached turn-ids against current DOM

**Processing:**
1. **Immediate detection**: Check turn-id existence during popup initialization
2. **Show refresh modal**: Modal overlay within popup with clear message
3. **User confirmation**: User clicks "Refresh Mappings" button
4. **Close popup**: Extension popup closes to show progress overlay
5. **Trigger analysis**: Run full analysis operation (UF-01) to regenerate mappings
6. **Update internal data**: Replace old turn-id mappings with new ones
7. **Preserve existing analysis**: Old JSON/Mermaid in chat remains unchanged
8. **Completion**: User can reopen popup with fully functional navigation

**Response:** Analysis operation completes, mappings updated, navigation restored
**User Impact:** **Proactive solution** - issue detected and resolved immediately on popup open

---

## **Storage Schema**

### **Reference Data**
```javascript
{
  "analysis_turn_chat_abc123": "turn-456789",
  "analysis_completed_chat_abc123": 1672531200000
}
```

### **Cached Analysis Data**
```javascript
{
  "analysis_data_chat_abc123": {
    "turnId": "turn-456789",
    "timestamp": 1672531200000,
    "jsonData": "{\"type\":\"gitGraph\",\"actions\":[...]}",  // Uses integer IDs (1, 2, 3)
    "mermaidData": "gitGraph\n    commit id: \"Initial\"...", // Uses integer IDs (1, 2, 3)
    "branchMap": {
      "1": { "thread": "Feature A", "messageId": 1 },
      "3": { "thread": "Bug Fix", "messageId": 3 }
    },
    "currentTurnIds": ["turn-123", "turn-456", "turn-789"] // For refresh detection
  }
}
```

---

## **UI State Summary Table**

| **Use Case** | **mainView** | **filteringView** | **mermaidSection** | **Find Analysis** | **Buttons State** |
|---|---|---|---|---|---|
| UC-01: Wrong Domain | No | No | No | No | N/A |
| UC-02: New Chat | No | No | No | No | N/A |
| UC-03: No Analysis | Yes Basic | No | No | No | Enabled |
| UC-04: Analysis Visible | Yes Full | Yes | Yes | No | Enabled |
| UC-05: Analysis Hidden | Yes Full | Yes | Yes | Optional | Enabled |
| UC-06: Analysis Corrupted | Yes (Cache-dependent) | Yes (Cache-dependent) | Yes (Cache-dependent) | Warning | Enabled |
| UC-07: Multiple Analyses | Yes Full | Yes | Yes | No | Enabled |
| UC-08: Analysis in Progress | **Popup Closed** | **Popup Closed** | **Popup Closed** | **Popup Closed** | **N/A (Popup Closed)** |
| UC-09: Go to Branch in Progress | **Popup Closed*** | **Popup Closed*** | **Popup Closed*** | **Popup Closed*** | **N/A (Popup Closed)** |
| UC-10: Copy Branch in Progress | **Popup Closed** | **Popup Closed** | **Popup Closed** | **Popup Closed** | **N/A (Popup Closed)** |
| UC-11: Popup During Operation | Yes Full | Yes (Disabled) | Yes (Disabled) | Status Message | **All Disabled (Safe)** |
| UC-12: Operation Interrupted | Yes (Recovery) | Yes (Recovery) | Yes (Recovery) | No | **Enabled (Fresh)** |

**Notes:**
- UC-09*: Go to Branch popup only closes if search is needed. For direct navigation (branch immediately visible), popup remains open.
- UC-11: "All Disabled (Safe)" indicates progress overlay detection prevents conflicts by disabling buttons when operations are running.