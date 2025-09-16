
// content_script.js
console.log("CS: Google AI Studio Chat Threads - Content script loaded.");

let pageConfig = { turnSelector: null };

// Generate unique chat ID based on URL only (no timestamp so same chat = same ID)
function generateChatId() {
  const url = window.location.href;
  // Remove any hash/fragment and query params to focus on the core chat URL
  const cleanUrl = url.split('#')[0].split('?')[0];
  
  console.log("CS: Checking URL for chat ID generation:", cleanUrl);
  
  // Only work on URLs with format: https://aistudio.google.com/prompts/[CHAT_ID]
  // where CHAT_ID is a specific alphanumeric string (not "new_chat" or similar)
  const chatUrlPattern = /^https:\/\/aistudio\.google\.com\/(?:u\/\d+\/)?prompts\/([a-zA-Z0-9_-]+)$/;
  const match = cleanUrl.match(chatUrlPattern);
  
  if (match) {
    const chatId = match[1];
    // Exclude template URLs like "new_chat", "new", etc.
    if (chatId === 'new_chat' || chatId === 'new' || chatId.length < 10) {
      console.log("CS: Detected template URL, returning null chat ID");
      return null;
    }
    
    console.log("CS: Valid chat ID found:", chatId);
    return `chat_${chatId}`;
  }
  
  console.log("CS: URL does not match chat pattern, returning null chat ID");
  return null; // Not a valid chat URL
}

// Get current chat ID for the current page
function getCurrentChatId() {
  return generateChatId(); // Now this is consistent for the same chat
}

// --- SIMPLE PROGRESS OVERLAY FUNCTIONS ---
let progressOverlay = null;

function showProgressOverlay() {
  // Remove any existing overlay
  hideProgressOverlay();
  
  // Create overlay
  progressOverlay = document.createElement('div');
  progressOverlay.id = 'chat-analysis-progress';
  progressOverlay.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2c3e50;
      color: white;
      padding: 20px 30px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: 'Segoe UI', Arial, sans-serif;
      text-align: center;
      min-width: 300px;
    ">
      <div style="margin-bottom: 15px; font-size: 16px; font-weight: bold;">
        📊 Analyzing Chat History
      </div>
      <div id="progress-text" style="margin-bottom: 10px; font-size: 14px; color: #bdc3c7;">
        Collecting messages...
      </div>
      <div style="
        width: 100%;
        height: 4px;
        background: #34495e;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 15px;
      ">
        <div id="progress-bar" style="
          height: 100%;
          background: linear-gradient(90deg, #3498db, #2ecc71);
          width: 0%;
          transition: width 0.3s ease;
        "></div>
      </div>
      <div style="font-size: 12px; color: #95a5a6;">
        The prompt will be pasted for you to review and send
      </div>
    </div>
  `;
  
  // Apply overlay background
  progressOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  document.body.appendChild(progressOverlay);
  console.log('CS: Progress overlay shown');
}

function updateProgressOverlay(message, progress = 0) {
  if (!progressOverlay) return;
  
  const progressText = progressOverlay.querySelector('#progress-text');
  const progressBar = progressOverlay.querySelector('#progress-bar');
  
  if (progressText) {
    progressText.textContent = message;
  }
  
  if (progressBar) {
    progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
  }
  
  console.log(`CS: Progress updated: ${message} (${progress}%)`);
}

function hideProgressOverlay() {
  if (progressOverlay) {
    progressOverlay.remove();
    progressOverlay = null;
    console.log('CS: Progress overlay hidden');
  }
}

function determinePageConfiguration() {
  const chatId = getCurrentChatId();
  // Only set turn selector if we have a valid chat ID (i.e., we're on an actual chat page)
  pageConfig.turnSelector = chatId ? 'ms-chat-turn' : null;
  console.log("CS: Page configuration determined:", { chatId, turnSelector: pageConfig.turnSelector });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("CS: Received message:", request);
  switch (request.action) {
    case 'getCurrentChatInfo':
      // Return current chat ID and check if data exists for this chat
      const currentChatId = getCurrentChatId();
      
      // Handle new_chat pages that don't have a real chat ID
      if (!currentChatId) {
        sendResponse({
          chatId: null,
          hasAnalysis: false,
          timestamp: null,
          isNewChat: true
        });
        return true;
      }
      
      chrome.storage.local.get([
        `thread_map_${currentChatId}`, 
        `analysis_completed_${currentChatId}`, 
        `data_created_${currentChatId}`
      ], (data) => {
        sendResponse({
          chatId: currentChatId,
          hasAnalysis: !!data[`analysis_completed_${currentChatId}`],
          timestamp: data[`data_created_${currentChatId}`],
          isNewChat: false
        });
      });
      return true; // Will respond asynchronously
    case 'scrollToBottom':
      scrollToBottomOfChat();
      sendResponse({ status: 'ok' });
      break;
    case 'analyzeAndPrepare':
      analyzeAndPrepare();
      sendResponse({ status: 'ok' });
      break;
    case 'loadAnalysis':
      loadAnalysis(false); // false = no alerts (for auto-loading)
      sendResponse({ status: 'ok' });
      break;
    case 'loadAnalysisWithAlerts':
      loadAnalysis(true); // true = show alerts (for manual user action)
      sendResponse({ status: 'ok' });
      break;
    case 'openThreadInNewChat':
      console.log("CS: Opening thread:", request.threadName);
      if (request.threadName) {
        openFilteredThread(request.threadName);
      } else {
        console.error("CS: No threadName provided for openThreadInNewChat");
      }
      sendResponse({ status: 'ok' });
      break;
    case 'goToBranch':
      console.log("CS: Going to branch:", request.threadName);
      if (request.threadName) {
        goToBranch(request.threadName);
      } else {
        console.error("CS: No threadName provided for goToBranch");
      }
      sendResponse({ status: 'ok' });
      break;
    case 'cancelAnalysis':
      console.log("CS: Analysis cancellation requested");
      analysisCancelled = true;
      sendResponse({ status: 'cancelled' });
      break;
  }
  return true;
});

// Function to scroll to the bottom of the chat
function scrollToBottomOfChat() {
  console.log("CS: Scrolling to bottom of chat...");
  
  determinePageConfiguration();
  if (!pageConfig.turnSelector) { 
    console.log("CS: Could not determine page configuration for scrolling");
    return; 
  }

  const allTurns = Array.from(document.querySelectorAll(pageConfig.turnSelector));
  if (allTurns.length === 0) { 
    console.log("CS: No messages found to scroll to");
    return; 
  }

  // Get the last (newest) message
  const lastTurn = allTurns[allTurns.length - 1];
  
  console.log(`CS: Found ${allTurns.length} messages, scrolling to the last one`);
  
  // Scroll to the last message with smooth behavior
  lastTurn.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'end',
    inline: 'nearest'
  });
  
  // Also scroll the page to bottom to ensure we're at the very bottom
  setTimeout(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }, 500);
  
  console.log("CS: Scroll to bottom completed");
}

// --- TURNDOWN.JS HTML TO MARKDOWN CONVERTER ---
function htmlToMarkdown(html) {
    if (!html) return '';
    
    try {
        // Initialize Turndown service with custom options
        const turndownService = new TurndownService({
            headingStyle: 'atx',           // Use # for headings
            hr: '---',                     // Use --- for horizontal rules
            bulletListMarker: '-',         // Use - for bullet lists
            codeBlockStyle: 'fenced',      // Use ``` for code blocks
            fence: '```',                  // Code fence characters
            emDelimiter: '*',              // Use * for emphasis
            strongDelimiter: '**',         // Use ** for strong
            linkStyle: 'inlined',          // Inline links
            linkReferenceStyle: 'full'     // Full reference links
        });

        // Custom rule to remove Angular-specific elements while preserving content
        turndownService.addRule('removeAngularNoise', {
            filter: function (node) {
                // Remove Angular comment nodes and specific attributes
                if (node.nodeType === 8) return true; // Comment nodes
                if (node.hasAttribute && (
                    node.hasAttribute('_ngcontent') || 
                    node.hasAttribute('_nghost') ||
                    (node.className && node.className.includes('ng-star-inserted'))
                )) {
                    return 'unwrap'; // Remove wrapper but keep content
                }
                return false;
            },
            replacement: function (content) {
                return content;
            }
        });

        // Custom rule for ms-cmark-node elements (just unwrap them)
        turndownService.addRule('unwrapMsCmarkNode', {
            filter: ['ms-cmark-node'],
            replacement: function (content) {
                return content;
            }
        });

        // Pre-process HTML to clean Angular attributes
        let cleanHtml = html
            .replace(/_ngcontent-[^=]*="[^"]*"/g, '')
            .replace(/_nghost-[^=]*="[^"]*"/g, '')
            .replace(/class="ng-star-inserted"/g, '')
            .replace(/<!---->/g, '');

        // Convert to markdown
        const markdown = turndownService.turndown(cleanHtml);
        
        // Post-process to clean up extra whitespace
        return markdown
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
        
    } catch (error) {
        console.warn('CS: Turndown conversion failed, using fallback:', error);
        // Fallback: return cleaned HTML with structural tags preserved
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        let cleanedHtml = tempDiv.innerHTML
            .replace(/\s+class="[^"]*"/g, '')
            .replace(/\s+style="[^"]*"/g, '')
            .replace(/\s+data-[^=]*="[^"]*"/g, '')
            .replace(/\s+aria-[^=]*="[^"]*"/g, '')
            .replace(/\s+id="[^"]*"/g, '')
            .replace(/_ngcontent-[^=]*="[^"]*"/g, '')
            .replace(/_nghost-[^=]*="[^"]*"/g, '');
        return cleanedHtml.trim();
    }
}

// --- FUNKCJA CZEKAJĄCA NA TREŚĆ W KONKRETNEJ WIADOMOŚCI ---
function waitForContentInTurn(turnElement, timeout = 3000) {
    return new Promise((resolve) => {
        if (!turnElement) { 
            console.log("CS: waitForContentInTurn - no turnElement provided");
            resolve(null); 
            return; 
        }
        console.log("CS: waitForContentInTurn - starting to wait for content...");
        const interval = 100;
        let elapsedTime = 0;
        const checker = setInterval(() => {
            // Try multiple selectors to find content, but EXCLUDE thinking panels
            let contentNode = null;
            
            // First, try to find content outside of thinking panels
            const textChunks = turnElement.querySelectorAll('ms-text-chunk');
            for (const textChunk of textChunks) {
                // Skip if this text chunk is inside a thinking panel (ms-thought-chunk)
                if (textChunk.closest('ms-thought-chunk')) {
                    console.log("CS: Skipping text chunk inside thinking panel");
                    continue;
                }
                
                const cmarkNode = textChunk.querySelector('ms-cmark-node');
                if (cmarkNode && cmarkNode.innerText.trim()) {
                    contentNode = cmarkNode;
                    console.log("CS: Found content in text chunk outside thinking panel");
                    break;
                }
            }
            
            // If no content found in text chunks, try direct ms-cmark-node (but exclude thinking panels)
            if (!contentNode) {
                const allCmarkNodes = turnElement.querySelectorAll('ms-cmark-node');
                for (const cmarkNode of allCmarkNodes) {
                    // Skip if this cmark node is inside a thinking panel
                    if (cmarkNode.closest('ms-thought-chunk') || cmarkNode.closest('mat-expansion-panel')) {
                        console.log("CS: Skipping cmark node inside thinking/expansion panel");
                        continue;
                    }
                    
                    if (cmarkNode.innerText.trim()) {
                        contentNode = cmarkNode;
                        console.log("CS: Found content in cmark node outside thinking panel");
                        break;
                    }
                }
            }
            
            // Fallback to other selectors if still no content found
            if (!contentNode || !contentNode.innerText.trim()) {
                contentNode = turnElement.querySelector('.turn-content') ||
                             turnElement.querySelector('.user-prompt-container') ||
                             turnElement.querySelector('.model-response-container');
                console.log("CS: Using fallback content selector");
            }
            
            // Check for attachments in the turn
            const attachments = extractAttachments(turnElement);
            
            // Check if we have either text content or attachments
            const hasTextContent = contentNode && contentNode.innerText.trim() !== "";
            const hasAttachments = attachments.length > 0;
            
            console.log(`CS: Content check - hasTextContent: ${hasTextContent}, hasAttachments: ${hasAttachments}, elapsed: ${elapsedTime}ms`);
            if (hasTextContent && contentNode) {
                console.log(`CS: Found text content preview: "${contentNode.innerText.trim().substring(0, 100)}..."`);
            }
            if (hasAttachments) {
                console.log(`CS: Found ${attachments.length} attachments:`, attachments.map(a => a.name));
            }
            
            if (hasTextContent || hasAttachments) {
                clearInterval(checker);
                
                const textContent = contentNode ? contentNode.innerText.trim() : "";
                const richContent = contentNode ? contentNode.innerHTML.trim() : "";
                
                // Log the actual HTML content to see what we're working with
                console.log(`CS: Raw HTML content preview: "${richContent.substring(0, 200)}..."`);
                
                // Since no markdown is stored in data attributes, convert HTML to markdown
                // This gives us clean, readable formatting for analysis and exports
                let markdownContent = htmlToMarkdown(richContent);
                
                console.log(`CS: Converted markdown preview: "${markdownContent.substring(0, 200)}..."`);
                
                // Use the markdown content as our clean rich content
                let cleanRichContent = markdownContent;
                
                console.log(`CS: Cleaned HTML content preview: "${cleanRichContent.substring(0, 200)}..."`);
                
                // Combine text content with attachment info (for analysis detection)
                let combinedTextContent = textContent;
                // Use cleaned rich content for better formatting preservation
                let combinedRichContent = cleanRichContent;
                
                if (hasAttachments) {
                    const attachmentText = attachments.map(att => 
                        `[ATTACHMENT: ${att.name} (${att.type})]`
                    ).join('\n');
                    
                    combinedTextContent = attachmentText + (textContent ? '\n\n' + textContent : '');
                    combinedRichContent = attachmentText + (cleanRichContent ? '\n\n' + cleanRichContent : '');
                }
                
                resolve({
                    richContent: combinedRichContent,     // Now contains cleaned HTML
                    textContent: combinedTextContent,     // Still plain text for analysis detection
                    attachments: attachments
                });
            } else if (elapsedTime >= timeout) {
                clearInterval(checker);
                console.warn(`CS: Timeout waiting for content in turn. It might be empty.`);
                resolve(null);
            }
            elapsedTime += interval;
        }, interval);
    });
}

// Function to extract attachment information from a turn element
function extractAttachments(turnElement) {
    const attachments = [];
    
    console.log("CS: extractAttachments - starting extraction...");
    console.log("CS: Turn element classes:", turnElement.className);
    console.log("CS: Turn element preview:", turnElement.outerHTML.substring(0, 300) + "...");
    
    // Look for Google AI Studio specific file chunk structure
    const fileChunks = turnElement.querySelectorAll('ms-file-chunk');
    console.log(`CS: Found ${fileChunks.length} file chunks in turn`);
    
    fileChunks.forEach((fileChunk, index) => {
        // Look for the filename in the span with title attribute
        const nameSpan = fileChunk.querySelector('span.name[title]');
        const tokenSpan = fileChunk.querySelector('span.token-count');
        
        if (nameSpan) {
            const fileName = nameSpan.getAttribute('title') || nameSpan.textContent.trim();
            const tokenCount = tokenSpan ? tokenSpan.textContent.trim() : 'unknown size';
            
            // Extract file type from filename
            let fileType = 'unknown';
            if (fileName.includes('.')) {
                fileType = fileName.split('.').pop().toLowerCase();
            }
            
            // Look for timestamp information in various places
            let attachmentTimestamp = null;
            
            // Check for timestamp in parent elements, data attributes, or nearby elements
            const parentTurn = turnElement;
            const parentChunk = fileChunk.closest('ms-prompt-chunk');
            
            // Look for timestamp patterns in various attributes
            const timestampSelectors = [
                '[timestamp]',
                '[data-timestamp]', 
                '[data-time]',
                '[data-created]',
                '[data-uploaded]',
                'time',
                '.timestamp',
                '.time-info',
                '.upload-time'
            ];
            
            timestampSelectors.forEach(selector => {
                const timestampEl = parentTurn.querySelector(selector) || fileChunk.querySelector(selector);
                if (timestampEl && !attachmentTimestamp) {
                    const timestamp = timestampEl.getAttribute('timestamp') || 
                                    timestampEl.getAttribute('data-timestamp') ||
                                    timestampEl.getAttribute('data-time') ||
                                    timestampEl.getAttribute('datetime') ||
                                    timestampEl.textContent;
                    if (timestamp) {
                        attachmentTimestamp = timestamp;
                    }
                }
            });
            
            // Look for timestamp patterns in all attributes of the file chunk and parent elements
            const allElements = [fileChunk, parentChunk, parentTurn].filter(Boolean);
            allElements.forEach(el => {
                if (el && !attachmentTimestamp) {
                    Array.from(el.attributes || []).forEach(attr => {
                        if (attr.value && (
                            attr.name.includes('time') || 
                            attr.name.includes('date') ||
                            attr.name.includes('created') ||
                            attr.name.includes('uploaded')
                        )) {
                            // Check if it looks like a timestamp (various formats)
                            const timestampPatterns = [
                                /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,  // ISO format
                                /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,   // SQL format
                                /\d{1,2}\/\d{1,2}\/\d{4}/,              // Date format
                                /\d{10,13}/                             // Unix timestamp
                            ];
                            
                            timestampPatterns.forEach(pattern => {
                                if (pattern.test(attr.value) && !attachmentTimestamp) {
                                    attachmentTimestamp = attr.value;
                                }
                            });
                        }
                    });
                }
            });
            
            // If no specific timestamp found, try to estimate from message context
            if (!attachmentTimestamp) {
                // Look for any time-related text in the turn
                const turnText = turnElement.innerText || '';
                const timePatterns = [
                    /\d{1,2}:\d{2}:\d{2}/, // Time format
                    /\d{1,2}:\d{2}/, // Simple time
                    /(uploaded|attached|added).*(\d{1,2}:\d{2})/i // "uploaded at 14:30"
                ];
                
                timePatterns.forEach(pattern => {
                    const match = turnText.match(pattern);
                    if (match && !attachmentTimestamp) {
                        attachmentTimestamp = match[0];
                    }
                });
            }
            
            console.log(`CS: Found attachment ${index + 1}: ${fileName} (${fileType}) - ${tokenCount}`);
            if (attachmentTimestamp) {
                console.log(`CS: Attachment timestamp: ${attachmentTimestamp}`);
            } else {
                console.log(`CS: No timestamp found for attachment`);
            }
            
            attachments.push({
                name: fileName,
                type: fileType,
                tokenCount: tokenCount,
                timestamp: attachmentTimestamp,
                uploadTime: attachmentTimestamp // Keep both for compatibility
            });
        }
    });
    
    // Also look for ms-prompt-chunk that might contain attachments
    const promptChunks = turnElement.querySelectorAll('ms-prompt-chunk');
    promptChunks.forEach((chunk) => {
        const fileChunk = chunk.querySelector('ms-file-chunk');
        if (fileChunk && !attachments.some(att => att.element === fileChunk.outerHTML)) {
            // This file chunk wasn't already processed above
            const nameSpan = fileChunk.querySelector('span.name[title]');
            const tokenSpan = fileChunk.querySelector('span.token-count');
            
            if (nameSpan) {
                const fileName = nameSpan.getAttribute('title') || nameSpan.textContent.trim();
                const tokenCount = tokenSpan ? tokenSpan.textContent.trim() : 'unknown size';
                
                let fileType = 'unknown';
                if (fileName.includes('.')) {
                    fileType = fileName.split('.').pop().toLowerCase();
                }
                
                attachments.push({
                    name: fileName,
                    type: fileType,
                    tokenCount: tokenCount,
                    element: fileChunk.outerHTML
                });
            }
        }
    });
    
    // Fallback: Look for other common attachment indicators
    if (attachments.length === 0) {
        const fallbackSelectors = [
            'span[title*=".pdf"], span[title*=".doc"], span[title*=".txt"], span[title*=".md"]',
            'span[title*=".js"], span[title*=".py"], span[title*=".json"]',
            '[aria-label*="attachment"]',
            '.file-chunk-container span.name'
        ];
        
        fallbackSelectors.forEach(selector => {
            const elements = turnElement.querySelectorAll(selector);
            elements.forEach(element => {
                let fileName = 'Unknown file';
                let fileType = 'unknown';
                
                if (element.title) fileName = element.title;
                else if (element.textContent) fileName = element.textContent.trim();
                
                if (fileName.includes('.')) {
                    fileType = fileName.split('.').pop().toLowerCase();
                }
                
                // Avoid duplicates
                if (!attachments.some(att => att.name === fileName)) {
                    attachments.push({
                        name: fileName,
                        type: fileType,
                        tokenCount: 'unknown size',
                        element: element.outerHTML
                    });
                }
            });
        });
    }
    
    return attachments;
}

// Extract user messages from scrollbar aria-labels
function extractUserMessagesFromScrollbar() {
    console.log("CS: Extracting user messages from scrollbar...");
    const userMessages = new Map(); // turnId -> userMessage
    
    try {
        // Find the scrollbar section
        const scrollbar = document.querySelector('ms-prompt-scrollbar');
        if (!scrollbar) {
            console.log("CS: No scrollbar found");
            return userMessages;
        }
        
        // Find all scrollbar items with aria-label
        const scrollbarItems = scrollbar.querySelectorAll('.prompt-scrollbar-item button[aria-label][aria-controls]');
        console.log(`CS: Found ${scrollbarItems.length} scrollbar items`);
        
        scrollbarItems.forEach((item, index) => {
            const ariaLabel = item.getAttribute('aria-label');
            const ariaControls = item.getAttribute('aria-controls');
            
            if (ariaLabel && ariaControls && ariaLabel.trim() !== '') {
                // Extract turn ID from aria-controls (format: "turn-XXXXX")
                const turnId = ariaControls;
                
                // Filter out standard UI labels and only keep actual user messages
                const uiLabels = ['Edit', 'Rerun', 'Open options', 'Good response', 'Bad response', 'Conversation turn navigation'];
                const isUILabel = uiLabels.some(label => ariaLabel.includes(label));
                
                // Also filter out analysis prompts (they start with "You are a conversation analysis AI")
                const isAnalysisPrompt = ariaLabel.startsWith('You are a conversation analysis AI') || 
                                        ariaLabel.startsWith('You are a highly skilled conversation');
                
                if (!isUILabel && !isAnalysisPrompt) {
                    userMessages.set(turnId, ariaLabel);
                    console.log(`CS: Found user message for ${turnId}: "${ariaLabel.substring(0, 100)}..."`);
                }
            }
        });
        
        console.log(`CS: Extracted ${userMessages.size} user messages from scrollbar`);
        return userMessages;
        
    } catch (error) {
        console.error("CS: Error extracting user messages from scrollbar:", error);
        return userMessages;
    }
}

// Check if a turn contains only thinking content (and should be skipped)
function isThinkingOnlyTurn(turnElement) {
    if (!turnElement) return false;
    
    // Check if this turn has ms-thought-chunk
    const thoughtChunks = turnElement.querySelectorAll('ms-thought-chunk');
    if (thoughtChunks.length === 0) {
        return false; // No thinking content
    }
    
    // Check if this turn has any non-thinking content
    const textChunks = turnElement.querySelectorAll('ms-text-chunk');
    for (const textChunk of textChunks) {
        // If we find a text chunk that's NOT inside a thinking panel
        if (!textChunk.closest('ms-thought-chunk')) {
            const cmarkNode = textChunk.querySelector('ms-cmark-node');
            if (cmarkNode && cmarkNode.innerText && cmarkNode.innerText.trim()) {
                return false; // Has non-thinking content
            }
        }
    }
    
    // Also check for direct cmark nodes outside thinking panels
    const allCmarkNodes = turnElement.querySelectorAll('ms-cmark-node');
    for (const cmarkNode of allCmarkNodes) {
        // Skip if inside thinking panel
        if (cmarkNode.closest('ms-thought-chunk') || cmarkNode.closest('mat-expansion-panel')) {
            continue;
        }
        
        if (cmarkNode.innerText && cmarkNode.innerText.trim()) {
            return false; // Has non-thinking content
        }
    }
    
    // If we got here, this turn only has thinking content
    console.log(`CS: Turn contains only thinking content`);
    return true;
}

// --- OSTATECZNA WERSJA: WSPINACZKA I ZBIERANIE DANYCH JEDNOCZEŚNIE ---
async function climbAndScrapeHistory() {
    console.log("CS: Starting FINAL climb & scrape process...");
    determinePageConfiguration();
    if (!pageConfig.turnSelector) { return []; }

    const allTurns = Array.from(document.querySelectorAll(pageConfig.turnSelector));
    if (allTurns.length === 0) { return []; }

    // Extract user messages from scrollbar as backup (for debugging/validation)
    const userMessages = extractUserMessagesFromScrollbar();

    const scrapedHistory = [];
    let currentTurn = allTurns[allTurns.length - 1];
    
    let safetyBreak = 500;
    let turnIndex = allTurns.length;
    const totalTurns = allTurns.length;
    
    while (currentTurn && safetyBreak-- > 0) {
        // Send scroll progress update
        const processedTurns = totalTurns - turnIndex + 1;
        sendScrollProgress(processedTurns, totalTurns, 'climbing');
        
        console.log(`CS: Processing turn ${turnIndex} (${safetyBreak} iterations left)`);
        console.log(`CS: Turn classes: ${currentTurn.className}`);
        console.log(`CS: Turn HTML preview: ${currentTurn.outerHTML.substring(0, 200)}...`);
        
        // Check for cancellation
        if (analysisCancelled) {
          console.log("CS: Analysis cancelled during climbing");
          return scrapedHistory;
        }
        
        // Ustawiamy aktualny blok w widoku
        currentTurn.scrollIntoView({ block: 'center', behavior: 'smooth' });

        // Get turn ID for this turn
        const turnId = currentTurn.id;
        console.log(`CS: Processing turn with ID: ${turnId}`);
        
        // Check if this turn contains only thinking content
        const hasOnlyThinking = isThinkingOnlyTurn(currentTurn);
        if (hasOnlyThinking) {
            console.log(`CS: Skipping thinking-only turn ${turnId}`);
            // Skip this turn entirely - don't increment message numbers
        } else {
            // First try to extract content from the turn element itself
            const content = await waitForContentInTurn(currentTurn);
            console.log(`CS: Content found for turn ${turnIndex}:`, !!content);
            
                if (content) {
                    // Determine role based on turn structure
                    let role = "Model"; // Default to Model
                    
                    // Check if there's a data-turn-role attribute
                    const roleElement = currentTurn.querySelector('[data-turn-role]');
                    if (roleElement) {
                        const roleAttribute = roleElement.getAttribute('data-turn-role');
                        if (roleAttribute) {
                            role = roleAttribute;
                        }
                    }
                    
                    // Check for user class indicators
                    if (role === "Model") {
                        const userElement = currentTurn.querySelector('.user') || 
                                          currentTurn.querySelector('.chat-turn-container.user') ||
                                          currentTurn.querySelector('.user-prompt-container') ||
                                          currentTurn.querySelector('.author-label');
                        if (userElement) {
                            // Double-check by looking at the text content of author label
                            const authorLabel = currentTurn.querySelector('.author-label');
                            if (authorLabel && authorLabel.textContent.trim() === 'User') {
                                role = "User";
                            } else if (userElement.classList.contains('user') || 
                                      userElement.classList.contains('user-prompt-container')) {
                                role = "User";
                            }
                        }
                    }
                    
                    console.log(`CS: Detected role for turn ${turnId}: ${role}`);
                    console.log(`CS: Adding ${role} message with full content`);
                    
                    scrapedHistory.push({ 
                        role: role, 
                        richContent: content.richContent,
                        textContent: content.textContent,
                        attachments: content.attachments || [],
                        turnId: turnId // Store turn ID for branch navigation
                    });
                } else {
                    // Fallback: if no content found in turn, check scrollbar for user message
                    const userMessage = userMessages.get(turnId);
                    if (userMessage) {
                        console.log(`CS: Fallback - Found user message in scrollbar for ${turnId}: "${userMessage.substring(0, 100)}..."`);
                        scrapedHistory.push({
                            role: "User",
                            richContent: userMessage,
                            textContent: userMessage,
                            attachments: [],
                            turnId: turnId // Store turn ID for branch navigation
                        });
                    }
                }
            }

        const previousTurn = currentTurn.previousElementSibling;
        if (!previousTurn || !previousTurn.matches(pageConfig.turnSelector)) {
            console.log("CS: Reached the absolute top turn. Scrape finished.");
            break;
        }
        currentTurn = previousTurn;
        turnIndex--;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (safetyBreak <= 0) console.warn("CS: Scrape safety break triggered.");
    
    // Odwracamy zebraną historię, aby była w poprawnej kolejności
    return scrapedHistory.reverse();
}


// Function to check if user is at the bottom of the chat
function checkIfAtBottomOfChat() {
  determinePageConfiguration();
  if (!pageConfig.turnSelector) { 
    return { isAtBottom: false, error: "Could not determine page configuration" }; 
  }

  const allTurns = Array.from(document.querySelectorAll(pageConfig.turnSelector));
  if (allTurns.length === 0) { 
    return { isAtBottom: false, error: "No messages found" }; 
  }

  // Get the last (newest) message
  const lastTurn = allTurns[allTurns.length - 1];
  
  // Check if the last message is visible in the viewport
  const rect = lastTurn.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  
  // Consider "at bottom" if the last message is at least partially visible
  // We allow some margin (100px) to account for UI elements at the bottom
  const isLastMessageVisible = rect.top < (windowHeight - 100);
  
  // Also check scroll position - if we're near the bottom of the scrollable area
  const scrollableElement = document.scrollingElement || document.documentElement;
  const scrollTop = scrollableElement.scrollTop;
  const scrollHeight = scrollableElement.scrollHeight;
  const clientHeight = scrollableElement.clientHeight;
  
  // Consider "at bottom" if we're within 200px of the bottom
  const isNearBottom = (scrollTop + clientHeight) >= (scrollHeight - 200);
  
  const isAtBottom = isLastMessageVisible && isNearBottom;
  
  console.log("CS: Scroll position check:", {
    isLastMessageVisible,
    isNearBottom,
    isAtBottom,
    lastMessageRect: rect,
    scrollInfo: {
      scrollTop,
      scrollHeight,
      clientHeight,
      distanceFromBottom: scrollHeight - (scrollTop + clientHeight)
    }
  });
  
  return { 
    isAtBottom, 
    lastTurn,
    totalMessages: allTurns.length,
    distanceFromBottom: scrollHeight - (scrollTop + clientHeight)
  };
}

// --- PROGRESS TRACKING AND CANCELLATION ---
let analysisCancelled = false;

// Helper function to safely send messages to popup (if it exists)
function safeSendToPopup(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // Popup is closed or unavailable - this is normal, just ignore silently
        return;
      }
      if (callback) callback(response);
    });
  } catch (error) {
    // Extension context invalidated or popup unavailable - ignore silently
  }
}

function sendProgressUpdate(count) {
  // Send progress update only if popup is available (ignore if closed)
  safeSendToPopup({ action: 'updateProgress', count: count });
}

function sendScrollProgress(current, total, phase = 'climbing') {
  try {
    // Update progress overlay with scroll information
    if (phase === 'climbing' && total > 0) {
      const progress = Math.round((current / total) * 50) + 15; // 15-65% range for climbing
      updateProgressOverlay(`Scrolling through chat: ${current}/${total} messages`, progress);
    }
    
    // Still send to popup for backward compatibility (in case popup is open)
    safeSendToPopup({ 
      action: 'updateScrollProgress', 
      current: current, 
      total: total,
      phase: phase
    });
  } catch (error) {
    console.log('Could not send scroll progress update:', error);
  }
}

function sendAnalysisComplete() {
  // Send analysis complete signal only if popup is available (ignore if closed)
  safeSendToPopup({ action: 'analysisComplete' });
}

// Main analysis function
async function analyzeAndPrepare() {
  console.log("CS: Analysis process started.");
  analysisCancelled = false;
  
  // Show progress overlay
  showProgressOverlay();
  updateProgressOverlay("Preparing analysis...", 5);
  
  // Check if user is at the bottom of the chat before starting
  const scrollCheck = checkIfAtBottomOfChat();
  
  if (scrollCheck.error) {
    hideProgressOverlay();
    console.error("CS: Scroll check failed:", scrollCheck.error);
    return;
  }
  
  // Log position but don't block analysis - user has scroll button available
  if (!scrollCheck.isAtBottom) {
    console.warn(`CS: User not at bottom of chat (${Math.round(scrollCheck.distanceFromBottom)}px from bottom). Proceeding with analysis anyway since scroll button is available.`);
  } else {
    console.log("CS: User is at bottom of chat, proceeding with analysis.");
  }
  
  updateProgressOverlay("Collecting chat history...", 15);
  const scrapedHistory = await climbAndScrapeHistory();
  
  updateProgressOverlay("Processing messages...", 60);
  
  if (scrapedHistory.length === 0) {
    console.warn("CS: Scrape completed but found no content. Aborting.");
    hideProgressOverlay();
    console.error("CS: Could not find any content to analyze");
    return;
  }
  
  const chatHistoryForStorage = [];
  let historyForPrompt = "";

  scrapedHistory.forEach((message, index) => {
      // Check for cancellation
      if (analysisCancelled) {
        console.log("CS: Analysis cancelled, stopping processing");
        return;
      }
      
      // Send progress update
      sendProgressUpdate(index + 1);
      
      // Check if this is an analysis prompt
      const isAnalysisPrompt = message.textContent.includes("You are a conversation analysis AI") || 
                               message.textContent.includes("[CHAT HISTORY TO ANALYZE]") ||
                               message.textContent.includes("CHAT HISTORY TO ANALYZE") ||
                               message.textContent.includes("conversation analysis") ||
                               message.textContent.includes("analyze the chat history") ||
                               message.textContent.includes("provide two outputs: a JSON map of threads") ||
                               message.textContent.includes("Mermaid git graph") ||
                               message.textContent.includes("assign each message ID to a thematic thread") ||
                               message.textContent.includes("Read the entire chat history provided below") ||
                               (message.textContent.length > 5000 && message.role === "User"); // Very long user messages are likely analysis prompts
      
      // Check if this contains thinking/reasoning content (should be completely skipped)
      const isThinkingContent = message.textContent.includes("Assessing Input Nuance") ||
                               message.textContent.includes("Analyzing Contextual Implications") ||
                               message.textContent.includes("Decoding the User's Intent") ||
                               message.textContent.includes("Formulating the Response") ||
                               message.textContent.includes("Expand to view model thoughts") ||
                               message.textContent.includes("(experimental)") ||
                               message.textContent.includes("Thoughts");
      
      // Skip thinking content entirely (don't include in message count)
      if (isThinkingContent) {
        console.log(`CS: Skipping thinking content at index ${index + 1} (detected AI reasoning)`);
        return;
      }
      
      // For analysis prompts, replace content with placeholder but keep the message
      if (isAnalysisPrompt) {
        console.log(`CS: Replacing analysis prompt content at index ${index + 1} (length: ${message.textContent.length})`);
        const placeholderText = "Chat history skipped because it was meant for the analysis prompt, no need to reflect to this content.";
        
        chatHistoryForStorage.push({ 
          id: index + 1, 
          role: message.role, 
          richContent: placeholderText,
          textContent: placeholderText,
          attachments: message.attachments || [], // Keep attachments if any
          isAnalysisPrompt: true, // Mark as analysis prompt
          turnId: message.turnId || null
        });
        
        historyForPrompt += `MESSAGE ${index + 1} [id: ${message.turnId || 'unknown'}] (${message.role}):\n${placeholderText}\n\n---\n\n`;
      } else {
        // Regular message - include normally
        chatHistoryForStorage.push({ 
          id: index + 1, 
          role: message.role, 
          richContent: message.richContent,
          textContent: message.textContent,
          attachments: message.attachments || [],
          turnId: message.turnId || null
        });
        
        // Use rich content (markdown) for the prompt, which preserves formatting
        let messageText = message.richContent || message.textContent;
        if (message.attachments && message.attachments.length > 0 && !messageText.includes('[ATTACHMENT:')) {
          const attachmentInfo = message.attachments.map(att => 
            `[ATTACHMENT: ${att.name} (${att.type})]`
          ).join('\n');
          messageText = attachmentInfo + (messageText ? '\n\n' + messageText : '');
        }
        
        historyForPrompt += `MESSAGE ${index + 1} [id: ${message.turnId || 'unknown'}] (${message.role}):\n${messageText}\n\n---\n\n`;
      }
  });
  
  // Final cancellation check before saving
  if (analysisCancelled) {
    console.log("CS: Analysis cancelled before saving data");
    sendAnalysisComplete();
    return;
  }
  
  const chatId = getCurrentChatId();
  const timestamp = Date.now();
  console.log("CS: Using chat ID:", chatId);
  chrome.storage.local.set({ 
    [`chat_history_${chatId}`]: chatHistoryForStorage,
    current_chat_id: chatId,
    [`data_created_${chatId}`]: timestamp
  });

  const dualPurposePrompt = `**TASK:** You are a conversation analysis AI that maps conversation branches like Git.

[TASK]
1.  Read the entire chat history provided below.
2.  Assign each message turn-id to a thematic branch (e.g., "Extension Debugging", "GitHub Repo").
3.  Output ONE Mermaid gitGraph code block ONLY (no extra text).

=== OUTPUT FORMAT (STRICT) ===

Your response MUST be exactly one Mermaid block using PROPER gitGraph syntax.

Rules:
- Use valid Mermaid gitGraph syntax: commit message: "turn-XXXX | Branch: <name> | <optional notes>"
- Use branch "Name" and checkout "Name" lines as needed.
- Do NOT use "commit id:" - that's invalid syntax.
- Do NOT output any JSON. No prose outside the code block.

Example:
\`\`\`mermaid
gitGraph
   branch "Main"
   commit message: "turn-AAA111 | Branch: Main"
   branch "Weather in Gdansk"
   commit message: "turn-BBB222 | Branch: Weather in Gdansk"
   checkout "Main"
   commit message: "turn-CCC333 | Branch: Main"
\`\`\`

=== CHAT HISTORY TO ANALYZE ===

${historyForPrompt}

=== END OF INSTRUCTIONS ===`;
  
  updateProgressOverlay("Preparing analysis prompt...", 80);
  insertPrompt(dualPurposePrompt);
  
  updateProgressOverlay("Analysis prompt ready! Please click Send to run it.", 100);
  setTimeout(() => {
    hideProgressOverlay();
  }, 3000); // Keep overlay visible for 3 seconds to show completion
  
  setTimeout(() => watchForAnalysisResponse(scrapedHistory), 2000); 
}

function watchForAnalysisResponse(scrapedHistory) {
  const lastModelTurn = Array.from(document.querySelectorAll(`${pageConfig.turnSelector}.model`)).pop();
  if (!lastModelTurn) return;

  const observer = new MutationObserver((mutations) => {
      const contentNode = lastModelTurn.querySelector('ms-cmark-node');
      const responseText = contentNode ? contentNode.innerText.trim() : '';

      // Try to extract Mermaid first (preferred path now)
      let mermaidString = null;
      const mermaidMatch = responseText.match(/```mermaid\s*([\s\S]+?)\s*```/);
      if (mermaidMatch) {
        mermaidString = mermaidMatch[1];
      }

      if (mermaidString) {
        try {
          // Parse turnId and branch from commit messages: "turn-XXXX | Branch: Name"
          const enhancedThreadMap = {};
          const lines = mermaidString.split(/\r?\n/);
          for (const line of lines) {
            const commitMatch = line.match(/commit\s+message:\s*"([^"]+)"/);
            if (!commitMatch) continue;
            const messageText = commitMatch[1];
            const messageParts = messageText.split('|').map(s => s.trim());
            const turnIdPart = messageParts[0];
            const branchPart = messageParts.find(p => p.toLowerCase().startsWith('branch:')) || '';
            const turnId = turnIdPart && turnIdPart.startsWith('turn-') ? turnIdPart : null;
            const branchName = branchPart ? branchPart.replace(/^[Bb]ranch:\s*/, '') : null;
            if (!turnId || !branchName) continue;

            const idx = scrapedHistory.findIndex(m => m.turnId === turnId);
            if (idx !== -1) {
              const messageNum = idx + 1;
              enhancedThreadMap[messageNum] = { thread: branchName, turnId };
            }
          }

          const chatId = getCurrentChatId();
          if (chatId) {
            const storageData = {
              [`thread_map_${chatId}`]: enhancedThreadMap,
              [`mermaid_diagram_${chatId}`]: mermaidString,
              [`analysis_completed_${chatId}`]: true,
              current_chat_id: chatId
            };
            chrome.storage.local.set(storageData);
            chrome.storage.local.remove(`data_cleared_${chatId}`, () => {
              console.log("CS: Cleared data_cleared flag for chat:", chatId);
            });
            console.log("CS: Saved enhanced thread map from Mermaid-only output.");
          }

          observer.disconnect();
          return;
        } catch (err) {
          console.error('CS: Failed to parse Mermaid output', err);
        }
      }

      // Fallback: legacy JSON parsing path (kept for backward compatibility)
      let jsonString = null;
      const markdownMatch = responseText.match(/```json\s*([\s\S]+?)\s*```/);
      if (markdownMatch) {
        jsonString = markdownMatch[1];
      } else {
        const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) jsonString = jsonObjectMatch[0];
      }
      if (jsonString) {
        try {
          const threadMap = JSON.parse(jsonString);
          const enhancedThreadMap = {};
          for (const [key, threadName] of Object.entries(threadMap)) {
            let messageNum = null;
            let turnId = null;
            const isTurnIdKey = typeof key === 'string' && key.startsWith('turn-');
            if (isTurnIdKey) {
              turnId = key;
              const idx = scrapedHistory.findIndex(m => m.turnId === turnId);
              if (idx !== -1) messageNum = idx + 1;
            } else {
              const messageIndex = parseInt(key, 10) - 1;
              if (!Number.isNaN(messageIndex) && messageIndex >= 0 && messageIndex < scrapedHistory.length) {
                messageNum = messageIndex + 1;
                turnId = (scrapedHistory[messageIndex] && scrapedHistory[messageIndex].turnId) || null;
              }
            }
            if (messageNum !== null) {
              enhancedThreadMap[messageNum] = { thread: threadName, turnId };
            }
          }
          const chatId = getCurrentChatId();
          if (chatId) {
            chrome.storage.local.set({
              [`thread_map_${chatId}`]: enhancedThreadMap,
              [`analysis_completed_${chatId}`]: true,
              current_chat_id: chatId
            });
          }
          observer.disconnect();
        } catch (error) {
          console.error("CS: Failed to parse JSON from AI response.", error);
        }
      }
  });

  observer.observe(lastModelTurn, { childList: true, subtree: true });
  
  // Send completion signal
  sendAnalysisComplete();
  console.log("CS: Analysis response received and processed");
}

// New function to load analysis from the last model message
async function loadAnalysis(showAlerts = true) {
  console.log("CS: ===== LOAD ANALYSIS START =====");
  console.log("CS: Loading analysis from last model message...");
  
  determinePageConfiguration();
  console.log("CS: Page config determined:", pageConfig);
  
  if (!pageConfig.turnSelector) {
    console.log("CS: ERROR - No turn selector found");
    console.error("CS: Could not determine page configuration");
    return;
  }

  // Find the last model turn using the same logic as climbAndScrapeHistory
  // NOTE: We're looking for the NEWEST message (analysis response) that came AFTER step 1
  console.log("CS: Looking for all turns with selector:", pageConfig.turnSelector);
  const allTurns = Array.from(document.querySelectorAll(pageConfig.turnSelector));
  console.log("CS: Found all turns now:", allTurns.length);
  
  if (allTurns.length === 0) {
    console.log("CS: INFO - No turns found on this page");
    return;
  }

  // Find the last model turn by checking classList.contains('model')
  // This should be the analysis response that was generated AFTER step 1
  let lastModelTurn = null;
  for (let i = allTurns.length - 1; i >= 0; i--) {
    const turn = allTurns[i];
    console.log(`CS: Checking turn ${i}: classes =`, turn.className);
    
    // Check if it's a model turn (not user turn)
    const isModelTurn = !turn.classList.contains('user');
    console.log(`CS: Turn ${i} is model turn:`, isModelTurn);
    
    if (isModelTurn) {
      lastModelTurn = turn;
      console.log("CS: Found last model turn (analysis response) at index:", i);
      break;
    }
  }
  
  if (!lastModelTurn) {
    console.log("CS: INFO - No model turns found (normal for pages without AI responses)");
    return;
  }
  console.log("CS: Found last model turn:", lastModelTurn);
  console.log("CS: Last model turn classes:", lastModelTurn.className);
  console.log("CS: Last model turn HTML preview:", lastModelTurn.outerHTML.substring(0, 500) + "...");
  
  // Wait a bit for content to load, then try to get it directly
  console.log("CS: Waiting 1 second for content to load...");
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try multiple selectors to find content
  console.log("CS: Looking for content node...");
  let contentNode = lastModelTurn.querySelector('ms-cmark-node');
  console.log("CS: ms-cmark-node found:", !!contentNode);
  
  if (!contentNode) {
    contentNode = lastModelTurn.querySelector('.turn-content');
    console.log("CS: .turn-content found:", !!contentNode);
  }
  if (!contentNode) {
    contentNode = lastModelTurn.querySelector('[data-turn-role="Model"]');
    console.log("CS: [data-turn-role='Model'] found:", !!contentNode);
  }
  if (!contentNode) {
    // Try to find any text content in the turn
    contentNode = lastModelTurn;
    console.log("CS: Using lastModelTurn as content node");
  }
  
  console.log("CS: Final content node:", contentNode);
  console.log("CS: Content node tag name:", contentNode.tagName);
  console.log("CS: Content node classes:", contentNode.className);
  
  // Check if we need to expand collapsed panels to get the JSON
  console.log("CS: Checking for collapsed panels...");
  const collapsedPanels = contentNode.querySelectorAll('mat-expansion-panel[aria-expanded="false"]');
  console.log("CS: Found collapsed panels:", collapsedPanels.length);
  
  if (collapsedPanels.length > 0) {
    console.log('CS: Found collapsed panels, expanding them to access content');
    collapsedPanels.forEach((panel, index) => {
      console.log(`CS: Expanding panel ${index + 1}:`, panel);
      const header = panel.querySelector('mat-expansion-panel-header');
      if (header) {
        console.log(`CS: Clicking header for panel ${index + 1}`);
        header.click(); // Expand the panel
      } else {
        console.log(`CS: No header found for panel ${index + 1}`);
      }
    });
    // Wait a bit for the panels to expand
    console.log("CS: Waiting 500ms for panels to expand...");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (!contentNode) {
    console.log("CS: No content node found in last model turn");
    console.error("CS: Could not find content in the last model message");
    return;
  }

  console.log("CS: Extracting text content...");
  let responseText = contentNode.innerText ? contentNode.innerText.trim() : '';
  console.log("CS: Initial response text length:", responseText.length);
  console.log("CS: Initial response text preview:", responseText.substring(0, 200) + "...");
  
  // If no text found, try to get text from all code blocks including collapsed ones
  if (responseText.length === 0 || !responseText.includes('{')) {
    console.log("CS: No JSON found in main text, searching in all code blocks");
    const allCodeBlocks = lastModelTurn.querySelectorAll('pre code, .mat-expansion-panel-body pre code');
    console.log("CS: Found code blocks:", allCodeBlocks.length);
    
    let allText = '';
    allCodeBlocks.forEach((block, index) => {
      const blockText = block.innerText;
      console.log(`CS: Code block ${index + 1} text:`, blockText.substring(0, 100) + "...");
      allText += blockText + '\n';
    });
    
    if (allText.trim().length > 0) {
      responseText = allText.trim();
      console.log("CS: Combined text from all code blocks length:", responseText.length);
      console.log("CS: Combined text preview:", responseText.substring(0, 300) + "...");
    } else {
      console.log("CS: No text found in any code blocks");
    }
  } else {
    console.log("CS: JSON found in main text content");
  }
  
  if (responseText.length === 0) {
    console.log("CS: No text content found in the last model message");
    if (showAlerts) {
      alert("The last model message appears to be empty. Please ensure the AI has finished responding.");
    }
    return;
  }

  // Try to extract JSON and Mermaid from the response - handle both markdown and new code block structure
  console.log("CS: ===== JSON & MERMAID EXTRACTION START =====");
  let jsonString = null;
  let mermaidString = null;
  
  // NEW: Try to extract from ms-code-block structure first
  console.log("CS: Checking for new code block structure...");
  const codeBlocks = lastModelTurn.querySelectorAll('ms-code-block');
  console.log(`CS: Found ${codeBlocks.length} code blocks`);
  
  codeBlocks.forEach((codeBlock, index) => {
    const title = codeBlock.querySelector('mat-panel-title span:last-child');
    const codeElement = codeBlock.querySelector('pre code');
    
    if (title && codeElement) {
      const titleText = title.textContent.trim().toLowerCase();
      const codeContent = codeElement.textContent || codeElement.innerText || '';
      
      console.log(`CS: Code block ${index + 1}: "${titleText}" (${codeContent.length} chars)`);
      
      if (titleText === 'json' && codeContent.trim().startsWith('{')) {
        // Check if this is a combined JSON+Mermaid block
        if (codeContent.includes('```mermaid') || codeContent.includes('gitGraph')) {
          console.log("CS: WARNING - Detected combined JSON+Mermaid block, attempting to split...");
          
          // Try to extract JSON part (everything before ```mermaid or gitGraph)
          const jsonMatch = codeContent.match(/^[\s\S]*?}(?=\s*```mermaid|\s*gitGraph)/);
          if (jsonMatch) {
            jsonString = jsonMatch[0].trim();
            console.log("CS: SUCCESS - Extracted JSON from combined block");
            console.log("CS: JSON preview:", jsonString.substring(0, 200) + "...");
          }
          
          // Try to extract Mermaid part
          const mermaidMatch = codeContent.match(/(?:```mermaid\s*)?(gitGraph[\s\S]+?)(?:```|$)/);
          if (mermaidMatch) {
            mermaidString = mermaidMatch[1].trim();
            console.log("CS: SUCCESS - Extracted Mermaid from combined block");
            console.log("CS: Mermaid preview:", mermaidString.substring(0, 200) + "...");
          }
        } else {
          // Pure JSON block
          jsonString = codeContent.trim();
          console.log("CS: SUCCESS - Found pure JSON in code block structure");
          console.log("CS: JSON preview:", jsonString.substring(0, 200) + "...");
        }
      } else if (titleText === 'mermaid' && codeContent.includes('gitGraph')) {
        mermaidString = codeContent.trim();
        console.log("CS: SUCCESS - Found Mermaid in code block structure");
        console.log("CS: Mermaid preview:", mermaidString.substring(0, 200) + "...");
      }
    }
  });
  
  // Fallback to old extraction methods if new structure didn't work
  if (!jsonString || !mermaidString) {
    console.log("CS: Falling back to text-based extraction...");
    
    // Extract Mermaid diagram first
    console.log("CS: Trying to extract Mermaid diagram...");
    const mermaidMatch = responseText.match(/```mermaid\s*([\s\S]+?)\s*```/);
    if (mermaidMatch && !mermaidString) {
      mermaidString = mermaidMatch[1];
      console.log("CS: SUCCESS - Found Mermaid diagram");
      console.log("CS: Mermaid preview:", mermaidString.substring(0, 200) + "...");
    } else if (!mermaidString) {
      // Try without the markdown wrapper
      const gitGraphMatch = responseText.match(/gitGraph[\s\S]+?(?=```|$)/);
      if (gitGraphMatch) {
        mermaidString = gitGraphMatch[0];
        console.log("CS: SUCCESS - Found Mermaid diagram without wrapper");
        console.log("CS: Mermaid preview:", mermaidString.substring(0, 200) + "...");
      } else {
        console.log("CS: No Mermaid diagram found");
      }
    }
    
    // Extract JSON - Prioritize ```json format since we explicitly request it
    if (!jsonString) {
      console.log("CS: Trying markdown format (```json ... ```)");
      const markdownMatch = responseText.match(/```json\s*([\s\S]+?)\s*```/);
      if (markdownMatch) {
        jsonString = markdownMatch[1];
        console.log("CS: SUCCESS - Found markdown JSON format");
        console.log("CS: Markdown JSON preview:", jsonString.substring(0, 200) + "...");
      } else {
        console.log("CS: No markdown JSON format found");
        
        // Fallback: Try to find JSON object in the text (look for { ... } pattern)
        console.log("CS: Trying JSON object format ({ ... })");
        const jsonObjectMatch = responseText.match(/\{[\s\S]*?\}(?=\s*```|\s*$)/);
        if (jsonObjectMatch) {
          jsonString = jsonObjectMatch[0];
          console.log("CS: SUCCESS - Found JSON object format");
          console.log("CS: JSON object preview:", jsonString.substring(0, 200) + "...");
        } else {
          console.log("CS: No JSON object format found");
          console.log("CS: Looking for any curly braces...");
          const hasBraces = responseText.includes('{') && responseText.includes('}');
          console.log("CS: Contains curly braces:", hasBraces);
          
          if (hasBraces) {
            console.log("CS: Found braces but no complete JSON match");
            console.log("CS: Full response text for debugging:", responseText.substring(0, 1000) + "...");
          }
        }
      }
    }
  }
  
  if (!jsonString) {
    console.log("CS: INFO - No JSON analysis data found in current response");
    return;
  }

  try {
    console.log("CS: ===== JSON PARSING START =====");
    console.log("CS: Attempting to parse JSON string:", jsonString.substring(0, 300) + "...");
    const threadMap = JSON.parse(jsonString);
    console.log("CS: SUCCESS - JSON parsed successfully");
    console.log("CS: Thread map object:", threadMap);
    console.log("CS: Thread map keys:", Object.keys(threadMap));
    console.log("CS: Thread map values:", Object.values(threadMap));
    
    // Use current chat ID and save the thread map (already processed during analysis)
    const chatId = getCurrentChatId();
    console.log("CS: Current chat ID:", chatId);
    
    if (chatId) {
      console.log("CS: Saving thread map and visualization data to storage...");
      const storageData = { 
        [`thread_map_${chatId}`]: threadMap,
        [`analysis_completed_${chatId}`]: true,
        current_chat_id: chatId // Update current chat ID
      };
      
      // Also save Mermaid data if available
      if (mermaidString) {
        storageData[`mermaid_diagram_${chatId}`] = mermaidString;
        console.log("CS: Also saving Mermaid diagram to storage");
      }
      
      // Save original JSON for separate copying
      if (jsonString) {
        storageData[`json_data_${chatId}`] = jsonString;
        console.log("CS: Also saving original JSON to storage");
      }
      
      chrome.storage.local.set(storageData);
      console.log("CS: Thread map and visualization data saved to storage");
      
      // Clear the data_cleared flag since we have new data
      chrome.storage.local.remove(`data_cleared_${chatId}`, () => {
        console.log("CS: Cleared data_cleared flag for chat:", chatId);
      });
    } else {
      console.log("CS: ERROR - No chat ID found");
    }
    
    // Get unique thread names for the dropdown
    const threadNames = [...new Set(Object.values(threadMap))];
    console.log("CS: Unique thread names extracted:", threadNames);
    console.log("CS: Number of unique threads:", threadNames.length);
    
    // Get the timestamp for this chat and send to popup
    console.log("CS: Getting timestamp for popup...");
    chrome.storage.local.get([`data_created_${chatId}`], (timestampData) => {
      console.log("CS: Sending message to popup...");
      // Send message to popup to update the dropdown
      chrome.runtime.sendMessage({ 
        action: 'updateThreadDropdown', 
        threadNames: threadNames,
        timestamp: timestampData[`data_created_${chatId}`]
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("CS: Popup is closed, message not delivered:", chrome.runtime.lastError.message);
        } else {
          console.log("CS: Message sent to popup successfully");
        }
      });
    });
    
    console.log("CS: ===== LOAD ANALYSIS SUCCESS =====");
    console.log(`Analysis loaded successfully! Found ${threadNames.length} threads: ${threadNames.join(', ')}`);
    
  } catch (error) {
    console.error("CS: ERROR - Failed to parse JSON from AI response:", error);
    console.error("CS: JSON string that failed to parse:", jsonString);
    console.error("Failed to parse the analysis data");
  }
}

async function openFilteredThread(threadName) {
  console.log("CS: ===== OPEN FILTERED THREAD START =====");
  console.log("CS: Thread name:", threadName);
  
  // Use current chat ID for this page
  const chatId = getCurrentChatId();
  console.log("CS: Chat ID:", chatId);
  
  if (!chatId) {
    console.log("CS: ERROR - No chat ID found");
    console.error("CS: No chat session found");
    return;
  }
  
  console.log("CS: Getting data from storage...");
  const data = await chrome.storage.local.get([`chat_history_${chatId}`, `thread_map_${chatId}`]);
  console.log("CS: Chat history length:", data[`chat_history_${chatId}`] ? data[`chat_history_${chatId}`].length : 0);
  console.log("CS: Thread map exists:", !!data[`thread_map_${chatId}`]);
  
  if (!data[`chat_history_${chatId}`] || !data[`thread_map_${chatId}`]) {
    console.log("CS: ERROR - Missing data");
    console.error("CS: No analysis data found for this chat");
    return;
  }
  
  const threadMap = data[`thread_map_${chatId}`];
  console.log("CS: Thread map:", threadMap);
  console.log("CS: Looking for thread name:", threadName);
  
  // Find all messages that belong to this thread
  const chatHistory = data[`chat_history_${chatId}`];
  const threadMessages = chatHistory.filter(message => {
    const messageThread = threadMap[String(message.id)];
    console.log(`CS: Message ${message.id} -> thread "${messageThread}" (looking for "${threadName}")`);
    return messageThread === threadName;
  });
  
  console.log("CS: Found thread messages:", threadMessages.length);
  
  // Find the first message of the selected thread to determine the branch point
  const firstThreadMessage = threadMessages.length > 0 ? threadMessages[0] : null;
  const branchPoint = firstThreadMessage ? firstThreadMessage.id : null;
  console.log("CS: Branch point (first message of thread):", branchPoint);
  
  // Get all main branch messages BEFORE the branch point + all messages from the selected thread
  const contextMessages = [];
  
  // Add main branch context (all messages before the branch point)
  if (branchPoint) {
    const mainBranchContext = chatHistory.filter(message => message.id < branchPoint);
    console.log("CS: Adding main branch context messages:", mainBranchContext.length);
    contextMessages.push(...mainBranchContext);
  }
  
  // Add all messages from the selected thread
  console.log("CS: Adding selected thread messages:", threadMessages.length);
  contextMessages.push(...threadMessages);
  
  // Sort by ID to ensure chronological order
  contextMessages.sort((a, b) => a.id - b.id);
  
  console.log("CS: Total context messages (main + branch):", contextMessages.length);
  
  if (contextMessages.length === 0) {
    console.log("CS: ERROR - No context messages found");
    console.error(`CS: No messages found for thread "${threadName}"`);
    return;
  }

  // Create thread hierarchy information
  const mainBranchCount = branchPoint ? contextMessages.filter(m => m.id < branchPoint).length : 0;
  const threadInfo = {
    threadName: threadName,
    totalMessages: contextMessages.length,
    mainBranchMessages: mainBranchCount,
    threadSpecificMessages: threadMessages.length,
    branchPoint: branchPoint,
    originalChatLength: chatHistory.length
  };

  let filteredContent = `# Thread: ${threadName}\n\n`;
  filteredContent += `**Thread Context Information:**\n`;
  filteredContent += `- Selected Thread: ${threadInfo.threadName}\n`;
  filteredContent += `- Total messages in context: ${threadInfo.totalMessages}\n`;
  filteredContent += `- Main branch context: ${threadInfo.mainBranchMessages} messages\n`;
  filteredContent += `- Thread-specific messages: ${threadInfo.threadSpecificMessages} messages\n`;
  filteredContent += `- Branch started at message: ${threadInfo.branchPoint || 'N/A'}\n`;
  filteredContent += `- Original full chat length: ${threadInfo.originalChatLength} messages\n\n`;
  filteredContent += `---\n\n`;

  // Add all context messages (main branch + selected thread)
  for (const message of contextMessages) {
    const messageType = branchPoint && message.id < branchPoint ? "Main Branch" : threadName;
    
    // Use richContent (now markdown) for better formatting, fallback to textContent
    let cleanContent = message.richContent || message.textContent;
    
    // Check if this is an analysis prompt placeholder
    if (message.isAnalysisPrompt) {
      cleanContent = `*${cleanContent}*`; // Italicize placeholder text
    } else {
      // Add attachment information if present (for regular messages)
      if (message.attachments && message.attachments.length > 0) {
        const attachmentInfo = message.attachments.map(att => {
          const tokenInfo = att.tokenCount ? ` - ${att.tokenCount}` : '';
          const timeInfo = att.timestamp ? ` - uploaded ${att.timestamp}` : '';
          return `**📎 ATTACHMENT REQUIRED:** \`${att.name}\` (${att.type.toUpperCase()}${tokenInfo}${timeInfo})`;
        }).join('\n');
        
        // If message has both attachments and text, show attachments first
        if (cleanContent && !cleanContent.includes('[ATTACHMENT:')) {
          cleanContent = attachmentInfo + '\n\n' + cleanContent;
        } else if (!cleanContent) {
          cleanContent = attachmentInfo;
        }
      }
    }
    
    filteredContent += `## Message ${message.id} (${message.role}) - ${messageType}\n\n${cleanContent}\n\n---\n\n`;
  }

  // Check if there are any attachments across all messages
  const allAttachments = contextMessages.filter(msg => msg.attachments && msg.attachments.length > 0);
  const uniqueAttachments = [];
  allAttachments.forEach(msg => {
    msg.attachments.forEach(att => {
      if (!uniqueAttachments.some(existing => existing.name === att.name)) {
        uniqueAttachments.push(att);
      }
    });
  });

  let attachmentNotice = '';
  if (uniqueAttachments.length > 0) {
    const currentDate = new Date().toLocaleString();
    const attachmentList = uniqueAttachments.map(att => {
      const tokenInfo = att.tokenCount ? ` (${att.tokenCount})` : '';
      const timeInfo = att.timestamp ? ` - uploaded ${att.timestamp}` : '';
      return `- ${att.name}${tokenInfo}${timeInfo}`;
    }).join('\n');
    
    attachmentNotice = `\n\n⚠️ **IMPORTANT - ATTACHMENTS REQUIRED:**\nThis conversation references ${uniqueAttachments.length} file(s) that were attached in the original chat. To continue this conversation properly, please upload the following files from your Google AI Studio folder:\n\n${attachmentList}\n\n**Finding your files:** Look in your Google AI Studio file manager for files with these exact names and upload times. If you have multiple files with the same name, use the upload timestamp to identify the correct ones. Original thread extracted on ${currentDate}.\n\n`;
  }

  const finalContentForNewChat = `Please continue the conversation based on the following context, which is a complete thread from a previous chat including its main branch context. This contains ${threadInfo.totalMessages} messages total (${threadInfo.mainBranchMessages} from main branch context + ${threadInfo.threadSpecificMessages} from the selected "${threadName}" thread). The conversation branches at message ${threadInfo.branchPoint || 'N/A'}. Preserve the code formatting and structure:${attachmentNotice}\n\n${filteredContent}`;
  
  console.log("CS: Prepared content for clipboard (length):", finalContentForNewChat.length);
  console.log("CS: Content preview:", finalContentForNewChat.substring(0, 200) + "...");
  
  console.log("CS: Attempting to copy to clipboard...");
  
  // Try to focus the document first
  if (document.hasFocus && !document.hasFocus()) {
    console.log("CS: Document not focused, attempting to focus...");
    window.focus();
    document.body.focus();
  }
  
  // Use fallback method for content scripts
  copyToClipboardContentScript(finalContentForNewChat, threadName, threadInfo);
  
  console.log("CS: ===== OPEN FILTERED THREAD END =====");
}

function copyToClipboardContentScript(text, threadName, threadInfo) {
  // Try modern clipboard API first (with focus attempt)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      console.log("CS: Successfully copied to clipboard!");
      console.log(`Thread "${threadName}" copied to clipboard - ${threadInfo.totalMessages} messages total`);
    }).catch(err => {
      console.error('CS: Clipboard API failed:', err);
      fallbackCopyContentScript(text, threadName, threadInfo);
    });
  } else {
    // Fallback for browsers without clipboard API
    fallbackCopyContentScript(text, threadName, threadInfo);
  }
}

function fallbackCopyContentScript(text, threadName, threadInfo) {
  try {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.zIndex = '9999';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Try to copy using execCommand (legacy method)
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      console.log("CS: Successfully copied using fallback method!");
      console.log(`Thread "${threadName}" copied to clipboard - ${threadInfo.totalMessages} messages total`);
    } else {
      throw new Error('execCommand copy failed');
    }
  } catch (err) {
    console.error('CS: Fallback copy failed:', err);
    // Show manual copy dialog as last resort
    showManualCopyDialogContentScript(text, threadName, threadInfo);
  }
}

function showManualCopyDialogContentScript(text, threadName, threadInfo) {
  // Create a modal with selectable text for manual copy
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
  `;
  
  modal.innerHTML = `
    <div style="
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 80%;
      max-height: 80%;
      overflow: auto;
    ">
      <h3>Manual Copy Required</h3>
      <p><strong>Thread:</strong> "${threadName}" (${threadInfo.totalMessages} messages)</p>
      <p>Please select all text below and copy manually (Ctrl+C / Cmd+C):</p>
      <textarea readonly style="
        width: 100%;
        height: 300px;
        font-family: monospace;
        font-size: 12px;
        margin: 10px 0;
        border: 1px solid #ccc;
        padding: 10px;
      ">${text}</textarea>
      <button onclick="this.closest('div').parentElement.remove()" style="
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Close</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Auto-select the text
  const textarea = modal.querySelector('textarea');
  textarea.focus();
  textarea.select();
  
  console.log("CS: Manual copy dialog shown");
}

async function goToBranch(threadName) {
  console.log("CS: ===== GO TO BRANCH START =====");
  console.log("CS: Branch name:", threadName);
  
  // Use current chat ID for this page
  const chatId = getCurrentChatId();
  console.log("CS: Chat ID:", chatId);
  
  if (!chatId) {
    console.log("CS: ERROR - No chat ID found");
    return;
  }
  
  console.log("CS: Getting data from storage...");
  const data = await chrome.storage.local.get([`chat_history_${chatId}`, `thread_map_${chatId}`]);
  
  if (!data[`chat_history_${chatId}`] || !data[`thread_map_${chatId}`]) {
    console.log("CS: ERROR - No analysis data found for this chat");
    return;
  }
  
  const threadMap = data[`thread_map_${chatId}`];
  const chatHistory = data[`chat_history_${chatId}`];
  
  console.log("CS: === STORAGE DATA DEBUG ===");
  console.log("CS: Thread Map:", threadMap);
  console.log("CS: Chat History length:", chatHistory.length);
  console.log("CS: First 3 chat history entries:", chatHistory.slice(0, 3));
  console.log("CS: Last 3 chat history entries:", chatHistory.slice(-3));
  
  console.log("CS: Looking for branch name:", threadName);
  
  // Find the last message in this branch
  let lastMessageInThread = null;
  let lastTurnId = null;
  let lastMessageNumber = null;
  
  console.log("CS: === SEARCHING FOR BRANCH ===");
  // Iterate over existing keys only, sorted descending numerically, to avoid undefined gaps
  const sortedMessageNums = Object.keys(threadMap)
    .map(k => parseInt(k, 10))
    .filter(n => !Number.isNaN(n))
    .sort((a, b) => b - a);
  for (const messageNum of sortedMessageNums) {
    const threadData = threadMap[messageNum];
    if (threadData === undefined || threadData === null) {
      console.warn(`CS: Skipping message ${messageNum} - no thread data`);
      continue;
    }
    
    // Handle both old format (string) and new format (object with thread and turnId)
    const isObjectFormat = typeof threadData === 'object' && threadData !== null;
    const threadForMessage = isObjectFormat ? threadData.thread : threadData;
    const storedTurnId = isObjectFormat ? (threadData.turnId || null) : null; // Only available in new format
    
    console.log(`CS: Message ${messageNum}: Thread="${threadForMessage}", StoredTurnId="${storedTurnId}"`);
    
    if (threadForMessage === threadName) {
      // Get the corresponding message from chat history
      lastMessageInThread = chatHistory[messageNum - 1]; // Convert to 0-based index
      lastTurnId = storedTurnId || (lastMessageInThread && lastMessageInThread.turnId); // Use stored turn ID or fallback
      lastMessageNumber = messageNum;
      
      // Show first few words of the message content for verification
      const messagePreview = (lastMessageInThread.textContent || lastMessageInThread.richContent || 'No content').substring(0, 100);
      console.log(`CS: ✅ FOUND last message in branch "${threadName}" at message ${messageNum}`);
      console.log(`CS: 🎯 Using stored turnId: ${storedTurnId || 'Not stored, using fallback'}`);
      console.log(`CS: 📝 Message content preview: "${messagePreview}..."`);
      break;
    }
  }
  
  if (!lastMessageInThread) {
    console.log("CS: ❌ ERROR - No message found for branch:", threadName);
    console.log("CS: Available branches in thread map:", Object.values(threadMap));
    return;
  }
  
  // If turnId is undefined (old analysis data), try to find the turn element by scanning the page
  if (!lastTurnId && lastMessageNumber) {
    console.log(`CS: ⚠️ Turn ID is undefined for message ${lastMessageNumber}, trying to find turn element by scanning page...`);
    const allTurns = document.querySelectorAll(pageConfig.turnSelector || 'ms-chat-turn');
    console.log(`CS: Found ${allTurns.length} total turns on page`);
    
    // Log all turn IDs on the page for debugging
    console.log("CS: === ALL TURN IDs ON PAGE ===");
    allTurns.forEach((turn, index) => {
      console.log(`CS: Turn ${index}: ID="${turn.id}"`);
    });
    
    // Try to map the message number to a turn element by position
    // Turns are in the same order as messages (first message = first turn, etc.)
    if (allTurns.length > 0) {
      const turnIndex = lastMessageNumber - 1; // Convert to 0-based index (message 1 = index 0)
      if (turnIndex >= 0 && turnIndex < allTurns.length) {
        const estimatedTurn = allTurns[turnIndex];
        lastTurnId = estimatedTurn.id;
        console.log(`CS: Estimated turn ID by position: ${lastTurnId} (index ${turnIndex})`);
        console.log(`CS: Message ${lastMessageNumber} should map to turn index ${turnIndex} out of ${allTurns.length} total turns`);
      } else {
        console.log(`CS: Invalid turn index ${turnIndex} for ${allTurns.length} turns`);
      }
    }
  }
  
  if (!lastTurnId) {
    console.log("CS: ❌ ERROR - Could not find turn ID for branch:", threadName);
    console.log("CS: SUGGESTION - Please re-run the analysis to generate turn IDs for branch navigation");
    return;
  }
  
  console.log("CS: === ATTEMPTING NAVIGATION ===");
  console.log("CS: Target turn ID:", lastTurnId);
  
  // Find the turn element on the page and scroll to it
  const turnElement = document.getElementById(lastTurnId);
  if (turnElement) {
    console.log("CS: ✅ Found turn element, scrolling to turn:", lastTurnId);
    
    // Log some info about the element we found
    const turnContent = turnElement.querySelector('.turn-content');
    if (turnContent) {
      const contentPreview = turnContent.textContent?.substring(0, 100) || 'No text content';
      console.log("CS: 🎯 ACTUAL turn content:", contentPreview);
      
      const expectedContent = (lastMessageInThread.textContent || lastMessageInThread.richContent || 'No content').substring(0, 100);
      console.log("CS: 📝 EXPECTED content:", expectedContent);
      
      const isMatch = contentPreview.includes(expectedContent.substring(0, 30)) || expectedContent.includes(contentPreview.substring(0, 30));
      console.log("CS: ⚖️ CONTENT MATCH:", isMatch);
    }
    
    turnElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
    
    // Add a visual highlight effect
    turnElement.style.transition = 'background-color 0.3s ease';
    turnElement.style.backgroundColor = '#fff3cd';
    setTimeout(() => {
      turnElement.style.backgroundColor = '';
    }, 2000);
    
    console.log("CS: ✅ Successfully navigated to branch");
  } else {
    console.log("CS: ❌ ERROR - Could not find turn element with ID:", lastTurnId);
    console.log("CS: Available turn elements on page:");
    const allTurns = document.querySelectorAll(pageConfig.turnSelector || 'ms-chat-turn');
    allTurns.forEach((turn, index) => {
      console.log(`CS:   Turn ${index}: ID="${turn.id}"`);
    });
  }
  
  console.log("CS: ===== GO TO BRANCH END =====");
}

function insertPrompt(text) {
  const promptTextarea = document.querySelector('.prompt-input-wrapper textarea') || document.querySelector('ms-autosize-textarea textarea');
  if (promptTextarea) {
    promptTextarea.value = text;
    promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}