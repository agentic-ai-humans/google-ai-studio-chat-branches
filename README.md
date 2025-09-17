# Google AI Studio Chat Branches

Transform your long AI conversations into organized, cherry-pickable branches with a Git-like workflow and visual branch mapping.

> **🤖 100% AI-Generated Extension**: This entire Chrome extension was created using Cursor AI with no human coding. Every line of code, documentation, and feature was generated through AI-assisted development. See [Contributing](#contributing) for our AI-optimized issue reporting process.

## The Problem

Long AI conversations inevitably branch into multiple topics - you start discussing one feature, then pivot to debugging, then explore new ideas, then return to implementation details. By message 50, you have a tangled mess where important discussions are scattered throughout the timeline, making it impossible to:

- **Continue a specific discussion** without losing context
- **Track thematic development** across the conversation
- **Share relevant parts** with others without overwhelming them
- **Revisit decisions** and their reasoning paths

## The Solution: Git for Conversations

This extension applies Git's branching model to AI conversations, treating each topic as a **branch** that can be visualized, isolated, and cherry-picked.

### 🌳 **Visual Branch Mapping**
The extension generates a **Mermaid Git graph** that visualizes your conversation like a repository:

```mermaid
gitGraph
    commit id: "Initial Question"
    commit id: "Setup Discussion"
    branch Extension_Development
        checkout Extension_Development
        commit id: "Architecture Planning"
        commit id: "Feature Requirements"
        checkout main
        commit id: "General Questions"
    branch Debugging_Issues
        checkout Debugging_Issues
        commit id: "Error Analysis"
        commit id: "Console Logs"
        checkout Extension_Development
        commit id: "Implementation"
    branch Documentation
        checkout Documentation
        commit id: "README Updates"
        commit id: "API Documentation"
```

### 🍒 **Cherry-Pick Any Branch**
Just like Git, you can extract any branch with its complete history:
- **Main branch context**: All foundational discussion before the branch started
- **Branch-specific messages**: The focused conversation about that topic
- **Clean markdown export**: Ready to paste into a new chat for continuation

## What It Does

This extension implements a complete "Git-like" workflow for managing chat conversations:

- **🔍 Analyze conversation structure** using AI to identify thematic branches
- **📊 Generate visual branch maps** as Mermaid Git graphs
- **🍒 Cherry-pick specific branches** from complex conversations with full context
- **📎 Handle file attachments** with smart detection and timestamp tracking
- **🔄 Continue conversations** in new chats without losing historical context

### Key Features

- 🌳 **Branch Analysis**: AI-powered conversation analysis to identify thematic branches
- 🍒 **Cherry-Pick Branches**: Extract specific conversation branches with full context
- 📎 **Attachment Handling**: Smart detection of file attachments with timestamp tracking
- 🔄 **Branch Context**: Includes main branch context when copying branches
- 🧹 **Smart Filtering**: Automatically skips analysis prompts to avoid recursive bloat
- 📋 **Clean Markdown**: Copies threads as clean markdown for seamless pasting
- 💾 **Chat Isolation**: Separate data storage for different AI Studio conversations

## Installation

Since this extension is not on the Chrome Web Store, you can install it manually using Developer Mode.

1. **Download the Code:**  
   - Go to the [Releases page](https://github.com/agentic-ai-humans/google-ai-studio-chat-branches/releases) and download the latest `Source code (zip)` file.  
   - Unzip the file. You will now have a folder containing the extension files.

2. **Load the Extension in Chrome:**
   - Open Google Chrome and navigate to `chrome://extensions`.
   - Enable **"Developer mode"** using the toggle switch in the top-right corner.
   - Click the **"Load unpacked"** button that appears on the top-left.
   - Select the **`src`** folder from the files you unzipped. **Do not select the entire repository folder, only the `src` subfolder.**

The "Google AI Studio Chat Branches" extension should now appear in your list of extensions and be ready to use.

## How to Use

### Step-by-Step Workflow

#### 1. **Prepare Analysis Prompt**
- Open your conversation in Google AI Studio
- Click the extension icon in your Chrome toolbar
- Click **"1. Prepare Analysis Prompt"**
- The extension will:
  - Scrape your entire chat history (scrolling to capture all messages)
  - Filter out previous analysis prompts to avoid bloat
  - Detect file attachments with timestamps
  - Generate and paste a comprehensive analysis prompt

#### 2. **Run the Analysis**
- Press **Send** in the AI Studio chat to run the analysis
- The AI will analyze your conversation and provide TWO code blocks:
  - **Structured JSON (source of truth):**
    - Shape: `{ "type": "gitGraph", "actions": [ ... ] }`
    - Actions include commits with exact `turnId`s and `branch_hint`, e.g. `{ type: "commit", id: "turn-…", branch_hint: "Weather in Gdansk" }`
    - May also include `branch` and `checkout` actions to reflect flow
  - **Mermaid (visualization only):**
    - Clean diagram without turnIds; used only for rendering/preview
  
**💡 Pro Tip**: Copy the generated Mermaid code and paste it into [Mermaid Live Editor](https://mermaid.live) to see your conversation's visual thread structure!

#### 3. **Load Branch Analysis**
- Open the popup. It auto-loads data when analysis finishes, or click **Load Analysis**.
- The extension will:
  - Extract JSON + Mermaid from the AI response (works with separate blocks or a combined block)
  - Save JSON to storage and build the persistent `branch_map` with `{ thread, turnId }` per message
  - Populate the branch dropdown directly from the JSON actions (no dependency on Mermaid)
  - Show data creation timestamp

#### 4. **Select and Copy Branch**
- Choose a branch in the dropdown
- Click **Copy branch to clipboard**
- The extension will copy:
  - **Main branch context**: All messages before the branch point
  - **Selected branch**: All messages in the chosen branch
  - **Attachment notifications**: Clear instructions for required files
  - **Branch metadata**: Message counts, branch points, and context info

#### 5. **Continue in New Chat**
- Open a new Google AI Studio chat
- Paste the copied content
- Re-upload any required attachments (clearly listed with timestamps)
- Continue your conversation with full context

### 🌟 **The Magic: Mermaid Branch Visualization**

The extension's killer feature is transforming your chaotic conversation into a beautiful Git-style branch diagram:

#### **Before: Linear Message Hell**
```
Message 1: Initial question about extension
Message 2: How to handle DOM manipulation?
Message 3: Actually, let's discuss architecture first
Message 4: What about error handling?
Message 5: Back to DOM - use querySelector
Message 6: New idea: what about file attachments?
Message 7: Error handling should use try-catch
Message 8: File attachments are complex...
Message 50: Wait, what were we building again?
```

#### **After: Clear Thread Structure**
```mermaid
gitGraph
    commit id: "Initial Extension Idea"
    commit id: "Basic Requirements"
    branch DOM_Manipulation
        checkout DOM_Manipulation
        commit id: "querySelector Strategy"
        commit id: "Event Listeners"
        checkout main
        commit id: "Architecture Discussion"
    branch Error_Handling
        checkout Error_Handling
        commit id: "Try-Catch Patterns"
        commit id: "User Feedback"
        checkout DOM_Manipulation
        commit id: "Final Implementation"
    branch File_Attachments
        checkout File_Attachments
        commit id: "Detection Logic"
        commit id: "Timestamp Extraction"
```

#### **How It Works**
1. **AI Analysis**: The AI identifies thematic clusters in your conversation
2. **Branch Detection**: Messages are mapped to branches based on topic similarity
3. **Git Graph Generation**: Creates a Mermaid diagram showing how discussions evolved and branched (visual-only)
4. **Visual Navigation**: You can see exactly how ideas developed and where conversations split

This transforms conversation archaeology from "scroll and search" to "visual navigation"!

### Advanced Features

#### **Attachment Handling**
When conversations include file attachments, the extension:
- Detects files with names, types, and token counts
- Extracts upload timestamps when available
- Provides clear instructions for file re-upload
- Lists required files with timestamps to distinguish duplicates

Example attachment notice:
```
⚠️ IMPORTANT - ATTACHMENTS REQUIRED:
This conversation references 2 file(s) that were attached in the original chat:

- Test Tornada.md (43,655 tokens) - uploaded 2024-12-15T14:30:22
- business-plan.pdf (12,543 tokens) - uploaded 2024-12-15T09:15:45

Finding your files: Look in your Google AI Studio file manager for files with these exact names and upload times.
```

#### **Smart Branch Context**
Unlike simple filtering, the extension provides **full context** by including:
- All messages from the main conversation **before** the selected branch branched off
- All messages from the selected branch
- Clear labeling of which messages belong to "Main Branch" vs the selected branch

#### **Data Management**
- **Chat Isolation**: Each conversation has separate data storage
- **Clear Data**: Button to clear stored data with timestamp reference
- **Version Display**: Shows plugin version (v3.0.0) in bottom-left corner
- **Cross-Chat Detection**: Only shows data relevant to the current chat

## Example Use Cases

### 🔧 **Technical Debugging Session**
**Scenario**: 100-message conversation jumping between frontend bugs, database issues, and new feature ideas.

**With the extension**:
1. **Visual mapping** reveals 4 distinct threads: "Database Performance", "UI Bugs", "Authentication", "New Features"
2. **Thread isolation**: Extract just "Database Performance" with its 23 relevant messages
3. **Context preservation**: Include foundational database architecture discussion from main branch
4. **Focused continuation**: New chat starts with complete technical context, no confusion

**Result**: Instead of scrolling through 100 messages to find database-related discussions, you get a clean 23-message thread with perfect context.

### 📝 **Document Review Process**
1. Conversation analyzing multiple documents with attachments
2. Cherry-pick the "Contract Terms" thread
3. Copy with clear file requirements and timestamps
4. Continue legal review with proper document context

### 🎯 **Feature Development**
1. Brainstorming session with multiple feature ideas
2. Extract "User Authentication" thread with main branch context
3. Continue implementation discussion with full technical background
4. Maintain conversation history and decision context

## Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Content Script**: Handles DOM manipulation and chat analysis
- **Popup Interface**: Numbered workflow buttons for user interaction
- **Storage**: `chrome.storage.local` for persistent data with chat isolation

### Key Components
- **Smart Scrolling**: Climbs through chat history to capture all messages
- **DOM Analysis**: Robust parsing of Google AI Studio's Angular components
- **JSON Extraction**: Handles various AI response formats (markdown, collapsed panels)
- **Attachment Detection**: Comprehensive file detection with metadata extraction
- **Branch Logic**: Intelligent context assembly for thread continuity

### Browser Compatibility
- **Chrome**: Full support (Manifest V3)
- **Edge**: Compatible with Chromium-based versions
- **Other browsers**: Not supported (uses Chrome extension APIs)

## Troubleshooting

### Common Issues

**"No analysis found"**
- Ensure the AI has finished responding
- Check that the response contains valid JSON
- Try clicking "2. Load Analysis" after the AI completes

**"Error communicating with the page"**
- Refresh the Google AI Studio page
- Reload the extension
- Ensure you're on a valid AI Studio chat page

**Missing attachments**
- Check console logs for attachment detection
- Verify files are visible in the original chat
- Use timestamps to find correct files in AI Studio file manager

**Extension not working**
- Verify you're on `aistudio.google.com`
- Check that the extension is enabled in Chrome
- Look for console errors (F12 → Console tab)

## Version History

### v3.1.1 (Current)
- **Fixed mermaid.live URL generation**: Proper pako compression with JSON payload + deflate + base64-URL encoding
- **Improved gitGraph syntax**: Fixed branch checkout commands and merge syntax in analysis prompt template
- **Added pako.min.js library**: Enables correct mermaid.live integration
- **Enhanced Show Graph button**: Now generates working mermaid.live URLs that auto-load diagrams
- All changes generated 100% using Cursor AI

### v3.1.0
- Structured JSON gitGraph actions with exact turnIds (source of truth)
- Mermaid kept clean for visualization
- Branch dropdown fed from JSON; precise navigation via `{ thread, turnId }`
- Auto-refresh popup on analysis completion; auto-scroll back to bottom
- Smart attachment handling with timestamps
- Chat isolation and improved error handling

## License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

## Contributing

This extension was **100% generated using Cursor AI**. To maintain this workflow and ensure efficient AI-assisted development, please follow our structured issue reporting format.

### 🤖 AI-Optimized Issue Reporting

When reporting bugs or requesting features, use this format for optimal Cursor AI processing:

#### **Bug Reports**
```markdown
**ISSUE TYPE**: Bug Report
**PRIORITY**: [Critical/High/Medium/Low]
**BROWSER**: [Chrome Version X.X.X]
**AI STUDIO URL**: [Specific URL pattern where issue occurs]

**EXPECTED BEHAVIOR**:
[Clear, specific description of what should happen]

**ACTUAL BEHAVIOR**:
[Clear, specific description of what actually happens]

**REPRODUCTION STEPS**:
1. [Specific action]
2. [Specific action]
3. [Specific result]

**CONSOLE ERRORS** (F12 → Console):
```
[Paste any console errors here]
```

**EXTENSION STATE**:
- Chat ID: [If known]
- Analysis completed: [Yes/No]
- Data timestamp: [If visible in popup]
- Browser extensions: [List other extensions that might conflict]

**ADDITIONAL CONTEXT**:
[Any other relevant information]
```

#### **Feature Requests**
```markdown
**ISSUE TYPE**: Feature Request
**USE CASE**: [Specific scenario where this feature would help]

**PROPOSED SOLUTION**:
[Clear description of desired functionality]

**TECHNICAL CONSIDERATIONS**:
- UI Changes: [What UI changes would be needed]
- Data Storage: [Any new data storage requirements]
- Performance Impact: [Expected impact on extension performance]
- Browser Compatibility: [Any browser-specific considerations]

**ALTERNATIVE SOLUTIONS**:
[Other ways this could be implemented]

**PRIORITY JUSTIFICATION**:
[Why this feature should be prioritized]
```

#### **Code Improvement Suggestions**
```markdown
**ISSUE TYPE**: Code Improvement
**FILE(S)**: [Specific files that could be improved]
**CURRENT APPROACH**: [How it currently works]
**SUGGESTED APPROACH**: [How it could be better]
**BENEFITS**: [Performance, maintainability, etc.]
**RISKS**: [Potential breaking changes or complications]
```

### 🛠️ Development Architecture

The extension consists of:
- `manifest.json` - Extension configuration and permissions
- `popup.html/js` - User interface and workflow management
- `content_script.js` - DOM manipulation and chat analysis
- `pako.min.js` - Compression library for mermaid.live URLs
- `turndown.min.js` - HTML to Markdown conversion
- `icons/` - Extension icons for Chrome toolbar

### 🔄 AI-Assisted Development Process

1. **Issue Creation**: Use structured format above
2. **AI Analysis**: Cursor AI analyzes the issue context
3. **Code Generation**: AI generates fixes/features
4. **Testing**: Manual testing in Chrome Developer Mode
5. **Integration**: AI handles git commits and documentation updates

### 📋 Issue Labels

Use these labels for efficient categorization:
- `bug` - Something is broken
- `enhancement` - New feature request
- `documentation` - Docs need improvement
- `performance` - Performance optimization
- `mermaid` - Related to Mermaid graph generation
- `ui-ux` - User interface improvements
- `ai-analysis` - Chat analysis algorithm improvements
- `cursor-generated` - Fully AI-generated solution needed

### 🚀 Quick Development Setup

For AI-assisted development:
1. Clone repository: `git clone [repo-url]`
2. Open in Cursor: `cursor src/`
3. Load extension: Chrome → Extensions → Developer Mode → Load Unpacked → Select `src/`
4. Test on: `https://aistudio.google.com/prompts/[chat-id]`
5. Use structured prompts for AI assistance

### 💡 Contributing Guidelines

- **Structured Issues**: Always use the templates above
- **Context First**: Provide complete context for AI processing
- **Test Scenarios**: Include specific test cases
- **Browser Logs**: Always include console output
- **AI-Friendly**: Write issues as if briefing an AI developer

---

**Transform your AI conversations from linear chats into organized, navigable thread structures. Perfect for complex projects, research sessions, and collaborative AI workflows.**