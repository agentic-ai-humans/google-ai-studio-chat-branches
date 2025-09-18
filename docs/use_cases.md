# Google AI Studio Chat Branches Extension - User Guide

## **🚫 When the Extension Won't Work**

### **Wrong Website**
If you're on any website other than Google AI Studio, you'll see:
> "This plugin works on AI Studio chat pages. Please open a specific chat to use this extension."

### **New Chat Page**
If you're on the "new chat" page (before starting a conversation), you'll see the same message. The extension needs an actual chat with messages to work.

---

## **✅ When You Haven't Run Analysis Yet**

### **First Time Using the Extension**
When you open the extension on a chat that hasn't been analyzed yet, you'll see:
- **"Scroll to Bottom"** button - Click this first to make sure you're at the latest message
- **"New Analysis"** button - Click this to analyze your chat history
- A helpful tip explaining the process

**What happens when you click "New Analysis":**
1. The extension scrolls through your entire chat
2. It creates a special prompt for the AI to analyze your conversation
3. The prompt gets pasted into your chat (you need to press Send)
4. The AI responds with a breakdown of your conversation topics

---

## **🎉 After You've Run Analysis**

### **All Features Available**
Once the AI has analyzed your chat, you'll see the full extension with all these tools:

**📊 Conversation Branches:**
- **Branch dropdown** - Shows all the different branches in your conversation
- **"Go to branch"** - Jumps to messages from that branch
- **"Copy branch"** - Copies the main conversation up to the fork point, then all messages from the selected branch in chronological order

**🎨 Visualization Tools:**
- **"Copy JSON"** - Gets the raw data structure
- **"Copy Mermaid"** - Gets code for creating diagrams
- **"Show Graph"** - Opens an interactive visual map of your conversation flow

**🔄 Analysis Tools:**
- **"New Analysis"** - Run a fresh analysis (updates everything)
- **"Scroll to Bottom"** - Quick way to get to your latest messages

### **When You Can't See Your Analysis**
Sometimes you might scroll away from where the AI put its analysis. If this happens:
- The extension still works! All buttons remain functional
- You might see a **"Find Analysis"** button to jump back to the analysis
- Or just use **"New Analysis"** to create a fresh one

---

## **🔧 Common Situations**

### **Multiple Analyses in One Chat**
If you've run the analysis multiple times in the same chat:
- The extension automatically uses the **newest analysis**
- Older analyses are ignored
- All features work normally with the latest data

### **If Something Goes Wrong**
Sometimes the analysis might get corrupted or deleted:
- **Don't worry!** The extension remembers your data
- Most features will still work from memory
- If you see "Analysis data is corrupted," just run a **"New Analysis"**

---

## **📋 How to Use the Main Features**

### **Copying a Branch**
1. **Select a branch** from the dropdown (e.g., "Bug Fixes", "Feature Ideas")
2. **Click "Copy branch"** - This copies the main conversation up to where that branch started, then includes all messages from the selected branch in chronological order
3. **Open a new chat** and paste - Now you have the full context plus the focused discussion!

**Why this is useful:**
- Get complete context for a specific discussion thread
- Share coherent conversation flows with proper background
- Continue discussions with all necessary context preserved

### **Navigating Your Chat**
1. **Select a branch** from the dropdown
2. **Click "Go to branch"** - Jumps to where that branch starts
3. The messages get highlighted so you can see the context

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

## **🚨 What If Something Goes Wrong?**

### **"Could not find the analysis"**
**What happened:** The analysis message was deleted from your chat
**What to do:** Click **"New Analysis"** to create a fresh one

### **"Analysis data is corrupted"**
**What happened:** The analysis exists but got messed up somehow
**What to do:** Click **"New Analysis"** to fix it

### **"No content to analyze"**
**What happened:** Your chat is empty or only has AI "thinking" messages
**What to do:** Have some actual conversation first, then try analysis

### **Success Messages**
When you copy a branch, you'll see: *"The full history for [Topic Name] has been copied to your clipboard"*
Just paste it into a new chat to continue that specific discussion!

---

## **💾 Why the Extension Remembers Your Data**

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
| Wrong domain | ❌ (shows error) | ❌ | ❌ | ❌ |
| New chat | ❌ (shows error) | ❌ | ❌ | ❌ |
| Valid chat, no analysis | ✅ Basic | ❌ | ❌ | ❌ |
| Analysis visible | ✅ Full | ❌ | ✅ | ✅ |
| Analysis hidden | ✅ Full | ✅ | ✅ | ✅ |
| Analysis corrupted | ✅ Basic | ✅ | ❌ | ❌ |

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
  - `branchSelector` - populated dropdown
  - `openBranchButton` - "Copy branch to clipboard" (blue)
  - `goToBranchButton` - "Go to branch" (teal #16a085)
- `mermaidSection` (visible)
  - `copyJsonButton` - "Copy JSON" (orange #f39c12)
  - `copyMermaidButton` - "Copy Mermaid" (purple #9b59b6)
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

## **User Action Flows**

### **UF-01: New Analysis Flow**
**Trigger:** User clicks `analyzeButton`
**Steps:**
1. `showProgressOverlay()` displays center overlay
2. `climbAndScrapeHistory()` scrolls through chat
3. Progress updates: "Scrolling through chat: X/Y messages"
4. `insertPrompt()` pastes analysis prompt
5. `hideProgressOverlay()` after 3 seconds
6. User manually clicks Send in AI Studio
7. AI responds with analysis
8. Next popup open → UC-04 or UC-05

---

### **UF-02: Go to Branch Flow**
**Trigger:** User selects branch + clicks `goToBranchButton`
**Steps:**
1. `goToBranch(branchName)` called
2. Try `getLatestAnalysisFromDom()` first
3. If not found, use cached `branchMap`
4. Find target turn IDs for selected branch
5. `scrollIntoView()` to target turn
6. Highlight with yellow background for 2 seconds
7. Popup remains open

---

### **UF-03: Copy Branch Flow**
**Trigger:** User selects branch + clicks `openBranchButton`
**Steps:**
1. `openFilteredBranch(branchName)` called
2. Get analysis data (DOM or cache)
3. `climbAndScrapeHistory()` to collect all messages
4. Filter messages by branch using `branchMap`
5. Format as markdown with context
6. `copyToClipboardContentScript()` to clipboard
7. Success alert: *"The full history for [BRANCH_NAME] thread has been copied"*

---

### **UF-04: Show Graph Flow**
**Trigger:** User clicks `showGraphButton`
**Steps:**
1. Check `currentAnalysisData?.mermaidData`
2. `createMermaidLiveUrl()` with compression
3. `chrome.tabs.create()` opens new tab
4. Fallback: `window.open()` if tabs API fails

---

### **UF-05: Copy JSON/Mermaid Flow**
**Trigger:** User clicks `copyJsonButton` or `copyMermaidButton`
**Steps:**
1. Check `currentAnalysisData?.jsonData` or `mermaidData`
2. `copyToClipboard()` directly from cache
3. No additional processing needed

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
**Detection:** `code.includes('```mermaid')` in JSON panel
**Processing:** Regex extraction of Mermaid content
**Log:** `"Extracted Mermaid from combined JSON+Mermaid block"`
**User Impact:** Transparent - all features work normally

---

### **EF-05: Cache Fallback**
**Trigger:** `getLatestAnalysisFromDom()` returns null but cache exists
**Processing:** `getAnalysisFromCache()` provides fallback data
**Response:** `source: "cache"` in data response
**Log:** `"Loaded analysis from cache: turn-XXXXX"`
**User Impact:** All features work normally

---

### **EF-06: Branch Copy Success**
**Trigger:** Successful branch copy operation
**Response:** Alert: *"The full history for [BRANCH_NAME] thread has been copied to your clipboard. Please paste it into a new chat."*
**Type:** Informational (success notification)

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
    "jsonData": "{\"type\":\"gitGraph\",\"actions\":[...]}",
    "mermaidData": "gitGraph\n    commit id: \"Initial\"...",
    "branchMap": {
      "turn-123": { "thread": "Feature A", "turnId": "turn-123" },
      "turn-456": { "thread": "Bug Fix", "turnId": "turn-456" }
    }
  }
}
```

---

## **UI State Summary Table**

| **Use Case** | **mainView** | **filteringView** | **mermaidSection** | **Find Analysis** |
|---|---|---|---|---|
| UC-01: Wrong Domain | ❌ | ❌ | ❌ | ❌ |
| UC-02: New Chat | ❌ | ❌ | ❌ | ❌ |
| UC-03: No Analysis | ✅ Basic | ❌ | ❌ | ❌ |
| UC-04: Analysis Visible | ✅ Full | ✅ | ✅ | ❌ |
| UC-05: Analysis Hidden | ✅ Full | ✅ | ✅ | ⚠️ Optional |
| UC-06: Analysis Corrupted | ✅ (Cache-dependent) | ✅ (Cache-dependent) | ✅ (Cache-dependent) | ⚠️ Warning |
| UC-07: Multiple Analyses | ✅ Full | ✅ | ✅ | ❌ |