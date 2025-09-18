# Google AI Studio Chat Branches Extension - Complete Use Cases

## **1. User opens extension on ANY non-AI-Studio webpage**
**What shows:** `incorrectDomainView` (red message)
```
"This plugin works on AI Studio chat pages with URLs like:
https://aistudio.google.com/prompts/[CHAT_ID]
Please open or create a specific chat to use this extension."
```

---

## **2. User opens extension on AI Studio "new chat" page**
**URL:** `https://aistudio.google.com/prompts/new_chat` or `/prompts/new`
**What shows:** `incorrectDomainView` (same red message as case 1)
**Logic:** `generateChatId()` returns `null` because it's not a valid chat ID

---

## **3. User opens extension on valid AI Studio chat page - NO previous analysis**
**URL:** `https://aistudio.google.com/prompts/abc123xyz`
**Conditions:**
- Valid chat ID exists
- No stored analysis turn ID
- No analysis found in current DOM

**What shows:** `mainView` with basic controls
```
- "New Analysis" button (blue)
- Tip text about using scroll first
- "Scroll to Bottom" button (blue)
```

**Hidden sections:**
- `filteringView` (branch selector, copy/go-to buttons)
- `mermaidSection` (JSON/Mermaid tools)

---

## **4. User opens extension on valid chat - Analysis EXISTS and VISIBLE**
**URL:** `https://aistudio.google.com/prompts/abc123xyz`
**Conditions:**
- Valid chat ID exists
- Stored analysis turn ID exists
- Analysis turn found in current DOM (`analysisTurnFound: true`)

**What shows:** `mainView` with FULL functionality
```
- Branch selector dropdown (populated with branch names)
- "Copy branch to clipboard" button
- "Go to branch" button (teal)
- "Copy JSON" button (orange)
- "Copy Mermaid" button (purple) 
- "Show Mermaid Graph" button (green)
- Links to mermaid.live
below
- "New Analysis" button (blue)
- Tip text about using scroll first
- "Scroll to Bottom" button (blue)
```

---

## **5. User opens extension on valid chat - Analysis EXISTS but NOT VISIBLE**
**URL:** `https://aistudio.google.com/prompts/abc123xyz`
**Conditions:**
- Valid chat ID exists
- Stored analysis turn ID exists (`storedTurnId: "turn-456"`)
- Analysis turn NOT found in current DOM (`analysisTurnFound: false`)
- User scrolled away from analysis

**What shows:** `mainView` with "Find Analysis" notification
```
- "Find Analysis" button (green)
- Tip text "Analysis exists but not visible in current view"
- "New Analysis" button (blue)
- Tip text about using scroll first
- "Scroll to Bottom" button (blue)

```

**When user clicks "Find Analysis":**
- Scrolls to stored analysis turn
- Highlights it with yellow background
- Closes popup
- If not found: Shows alert "Could not find the analysis. It may have been deleted."

---

## **6. User opens extension - Analysis exists but CORRUPTED/DELETED**
**URL:** `https://aistudio.google.com/prompts/abc123xyz`
**Conditions:**
- Valid chat ID exists
- Stored analysis turn ID exists
- Analysis turn found in DOM but NO JSON/Mermaid data
- Analysis content was deleted/modified

**What shows:** `mainView` 
```
- "Find Analysis" button (green)
- Tip text "Analysis exists but not visible in current view"
- "New Analysis" button (blue)
- Tip text about using scroll first
- "Scroll to Bottom" button (blue)
```

when user presses find analysis and we conclude its corrupted we show message "Analysis data is corrupted, please run new analysis"
---

## **7. User opens extension - Multiple analysis turns exist**
**URL:** `https://aistudio.google.com/prompts/abc123xyz`
**Conditions:**
- Valid chat ID exists
- Multiple analysis turns in chat history
- `getLatestAnalysisFromDom()` finds the newest one

**What shows:** Same as case 4 (full functionality)
**Behavior:** Extension uses the LATEST analysis found, ignoring older ones

---

## **8. User runs analysis for the first time**
**From any valid chat page (cases 3-7):**
**Action:** Click "New Analysis"

**What happens:**
1. Shows progress overlay: "📊 Analyzing Chat History"
2. Scrolls through chat collecting messages
3. Inserts analysis prompt into textarea
4. User must manually click "Send" in AI Studio
5. After AI responds, analysis turn ID gets stored

**Result:** Next time user opens popup → Case 4 or 5

---

## **9. User switches between different chats**
**Chat A:** `https://aistudio.google.com/prompts/abc123xyz` (has analysis)
**Chat B:** `https://aistudio.google.com/prompts/def456uvw` (no analysis)

**Behavior:**
- Extension automatically detects URL change
- Shows appropriate state for each chat
- No cross-contamination between chats
- Each chat maintains separate storage keys

---

## **10. User scrolls away from analysis while popup is open**
**Scenario:** User has popup open showing full analysis (case 4)
**Action:** User scrolls to top of chat, making analysis invisible

**What happens:** 
- Popup state does NOT change immediately
- But if user closes/reopens popup → Case 5 (Find Analysis button appears)

---

## **11. User clicks "Go to branch" when analysis not visible**
**From case 5 (analysis exists but not visible):**
**Action:** Click "Go to branch" button

**What happens:**
1. `goToBranch()` function runs
2. First tries to find branch turn IDs in current DOM
3. If not found, triggers `climbAndScrapeHistory()` to scroll through chat
4. Finds target turn and scrolls to it with highlight
5. Popup stays open (unlike "Find Analysis" which closes)

---

## **12. User clicks "Copy branch to clipboard"**
**From case 4 or 5:**
**Action:** Select branch from dropdown → Click "Copy branch to clipboard"

**What happens:**
1. `openFilteredBranch()` function runs
2. Filters chat history to only selected branch messages
3. Formats as markdown with thread context
4. Copies to clipboard
5. User can paste in new chat or document

---

## **Exception Use Cases:**

### **E1. Analysis Not Found Exception**
**Trigger:** User clicks "Find Analysis" button but analysis turn ID doesn't exist in DOM
**Alert Message:** `"Could not find the analysis. It may have been deleted."`
**Cause:** Analysis was deleted or turn ID became invalid
**User Action:** User must run new analysis

---

### **E2. Analysis Corrupted Exception**
**Trigger:** User clicks "Find Analysis" button but analysis exists with no valid JSON/Mermaid data
**Alert Message:** `"Analysis data is corrupted, please run new analysis"`
**Cause:** Analysis turn exists but content was modified/deleted
**User Action:** User must run new analysis

---

### **E3. Empty Chat Exception**
**Trigger:** User clicks "New Analysis" but chat has no content to analyze
**Alert Message:** `"Could not find any content to analyze. Please ensure the chat is not empty."`
**Cause:** Chat contains no messages or all messages are empty/thinking-only
**User Action:** User must add content to chat before running analysis

---

### **E4. Branch Copy Success Exception**
**Trigger:** User successfully copies a branch to clipboard
**Alert Message:** `"The full history for the "[BRANCH_NAME]" thread has been copied to your clipboard. Please paste it into a new chat."`
**Cause:** Successful operation (informational alert)
**User Action:** User can paste content in new chat

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