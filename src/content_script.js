
// content_script.js

let pageConfig = { turnSelector: null };

// Generate unique chat ID based on URL only (no timestamp so same chat = same ID)
function generateChatId() {
  const url = window.location.href;
  // Remove any hash/fragment and query params to focus on the core chat URL
  const cleanUrl = url.split('#')[0].split('?')[0];
  
  
  // Only work on URLs with format: https://aistudio.google.com/prompts/[CHAT_ID]
  // where CHAT_ID is a specific alphanumeric string (not "new_chat" or similar)
  const chatUrlPattern = /^https:\/\/aistudio\.google\.com\/(?:u\/\d+\/)?prompts\/([a-zA-Z0-9_-]+)$/;
  const match = cleanUrl.match(chatUrlPattern);
  
  if (match) {
    const chatId = match[1];
    // Exclude template URLs like "new_chat", "new", etc.
    if (chatId === 'new_chat' || chatId === 'new' || chatId.length < 10) {
      return null;
    }
    
    return `chat_${chatId}`;
  }
  
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
  
}

function hideProgressOverlay() {
  if (progressOverlay) {
    progressOverlay.remove();
    progressOverlay = null;
  }
}

function determinePageConfiguration() {
  const chatId = getCurrentChatId();
  // Only set turn selector if we have a valid chat ID (i.e., we're on an actual chat page)
  pageConfig.turnSelector = chatId ? 'ms-chat-turn' : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getCurrentChatInfo':
      // Return current chat ID and check if analysis exists
      const currentChatId = getCurrentChatId();
      
      // Handle new_chat pages that don't have a real chat ID
      if (!currentChatId) {
        sendResponse({
          chatId: null,
          hasAnalysis: false,
          timestamp: null,
          isNewChat: true,
          analysisTurnFound: false
        });
        return true;
      }
      
      // Check for stored analysis turn-id
      chrome.storage.local.get([
        `analysis_turn_${currentChatId}`,
        `analysis_completed_${currentChatId}`
      ], (data) => {
        const storedTurnId = data[`analysis_turn_${currentChatId}`];
        const timestamp = data[`analysis_completed_${currentChatId}`];
        
        let analysisTurnFound = false;
        let hasVisibleAnalysis = false;
        
        // If we have a stored turn-id, check if it exists on the page
        if (storedTurnId) {
          const turnElement = document.getElementById(storedTurnId);
          analysisTurnFound = !!turnElement;
          
          if (analysisTurnFound) {
            // Verify it still contains analysis data
            const domExtract = extractJsonAndMermaidFromDom(turnElement);
            hasVisibleAnalysis = !!(domExtract && (domExtract.json || domExtract.mermaid));
          }
        }
        
        // Fallback: check DOM for any analysis if stored turn not found
        if (!hasVisibleAnalysis) {
          const analysis = getLatestAnalysisFromDom();
          hasVisibleAnalysis = analysis && analysis.hasData;
        }
        
        sendResponse({
          chatId: currentChatId,
          hasAnalysis: hasVisibleAnalysis,
          timestamp: timestamp,
          isNewChat: false,
          analysisTurnFound: analysisTurnFound,
          storedTurnId: storedTurnId
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
      loadAnalysis(false).then((result) => {
        sendResponse({ 
          status: 'ok', 
          hasJsonData: result && result.hasJsonData,
          hasMermaidData: result && result.hasMermaidData
        });
      }).catch(() => {
        sendResponse({ status: 'ok', hasJsonData: false, hasMermaidData: false });
      });
      return true; // Will respond asynchronously
    case 'loadAnalysisWithAlerts':
      loadAnalysis(true); // true = show alerts (for manual user action)
      sendResponse({ status: 'ok' });
      break;
    case 'getAnalysisData':
      // Get analysis data from DOM for popup
      const analysisData = getLatestAnalysisFromDom();
      if (analysisData && analysisData.hasData) {
        sendResponse({
          status: 'ok',
          hasData: true,
          jsonData: analysisData.json,
          mermaidData: analysisData.mermaid,
          branchMap: analysisData.branchMap
        });
      } else {
        sendResponse({
          status: 'ok',
          hasData: false
        });
      }
      break;
    case 'openBranchInNewChat':
      if (request.branchName) {
        openFilteredBranch(request.branchName);
      } else {
      }
      sendResponse({ status: 'ok' });
      break;
    case 'goToBranch':
      if (request.branchName) {
        goToBranch(request.branchName);
      } else {
      }
      sendResponse({ status: 'ok' });
      break;
    case 'cancelAnalysis':
      analysisCancelled = true;
      sendResponse({ status: 'cancelled' });
      break;
    case 'scrollToAnalysis':
      // Scroll to stored analysis turn
      const chatId = getCurrentChatId();
      if (chatId) {
        chrome.storage.local.get([`analysis_turn_${chatId}`], (data) => {
          const turnId = data[`analysis_turn_${chatId}`];
          if (turnId) {
            const turnElement = document.getElementById(turnId);
            if (turnElement) {
              // Check if analysis contains valid data
              const domExtract = extractJsonAndMermaidFromDom(turnElement);
              const hasValidData = !!(domExtract && (domExtract.json || domExtract.mermaid));
              
              if (hasValidData) {
                // Analysis is valid - scroll to it
                turnElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest'
                });
                
                // Add highlight effect
                turnElement.style.transition = 'background-color 0.3s ease';
                turnElement.style.backgroundColor = '#fff3cd';
                setTimeout(() => {
                  turnElement.style.backgroundColor = '';
                }, 2000);
                
                sendResponse({ status: 'found' });
              } else {
                // Analysis exists but is corrupted
                sendResponse({ status: 'corrupted' });
              }
            } else {
              sendResponse({ status: 'not_found' });
            }
          } else {
            sendResponse({ status: 'no_stored_turn' });
          }
        });
      } else {
        sendResponse({ status: 'no_chat_id' });
      }
      return true; // Will respond asynchronously
      break;
  }
  return true;
});

// Function to scroll to the bottom of the chat
function scrollToBottomOfChat() {
  
  determinePageConfiguration();
  if (!pageConfig.turnSelector) { 
    return; 
  }

  const allTurns = Array.from(document.querySelectorAll(pageConfig.turnSelector));
  if (allTurns.length === 0) { 
    return; 
  }

  // Get the last (newest) message
  const lastTurn = allTurns[allTurns.length - 1];
  
  
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
        // Fallback: use HTML cleaning if markdown conversion fails
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

// --- COMPREHENSIVE CONTENT EXTRACTION ---
function extractTurnContent(turnElement, userMessages, timeout = 3000) {
    return new Promise((resolve) => {
        if (!turnElement) { 
            resolve({
                richContent: '',
                textContent: '',
                attachments: [],
                source: 'invalid'
            }); 
            return; 
        }
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
                    continue;
                }
                
                const cmarkNode = textChunk.querySelector('ms-cmark-node');
                if (cmarkNode && cmarkNode.innerText.trim()) {
                    contentNode = cmarkNode;
                    break;
                }
            }
            
            // If no content found in text chunks, try direct ms-cmark-node (but exclude thinking panels)
            if (!contentNode) {
                const allCmarkNodes = turnElement.querySelectorAll('ms-cmark-node');
                for (const cmarkNode of allCmarkNodes) {
                    // Skip if this cmark node is inside a thinking panel
                    if (cmarkNode.closest('ms-thought-chunk') || cmarkNode.closest('mat-expansion-panel')) {
                        continue;
                    }
                    
                    if (cmarkNode.innerText.trim()) {
                        contentNode = cmarkNode;
                        break;
                    }
                }
            }
            
            // FAIL FAST: Don't silently accept missing content
            if (!contentNode || !contentNode.innerText.trim()) {
                // Try fallback selectors but log what we're doing
                const fallbackNode = turnElement.querySelector('.turn-content') ||
                                   turnElement.querySelector('.user-prompt-container') ||
                                   turnElement.querySelector('.model-response-container');
                
                if (fallbackNode && fallbackNode.innerText.trim()) {
                    contentNode = fallbackNode;
                }
            }
            
            // Check for attachments in the turn
            const attachments = extractAttachments(turnElement);
            
            // Check if we have either text content or attachments
            const hasTextContent = contentNode && contentNode.innerText.trim() !== "";
            const hasAttachments = attachments.length > 0;
            
            
            if (hasTextContent || hasAttachments) {
                clearInterval(checker);
                
                const textContent = contentNode ? contentNode.innerText.trim() : "";
                const richContent = contentNode ? contentNode.innerHTML.trim() : "";
                
                
                // Since no markdown is stored in data attributes, convert HTML to markdown
                // This gives us clean, readable formatting for analysis and exports
                let markdownContent = htmlToMarkdown(richContent);
                
                
                // Use the markdown content as our clean rich content
                let cleanRichContent = markdownContent;
                
                
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
                
                // Try scrollbar extraction as alternative method
                const turnId = turnElement.id;
                const userMessage = userMessages ? userMessages.get(turnId) : null;
                
                if (userMessage) {
                    resolve({
                        richContent: userMessage,
                        textContent: userMessage,
                        attachments: [],
                        source: 'scrollbar'
                    });
                } else {
                    resolve({
                        richContent: '',
                        textContent: '',
                        attachments: [],
                        source: 'empty'
                    });
                }
            }
            elapsedTime += interval;
        }, interval);
    });
}

// Function to extract attachment information from a turn element
function extractAttachments(turnElement) {
    const attachments = [];
    
    
    // Look for Google AI Studio specific file chunk structure
    const fileChunks = turnElement.querySelectorAll('ms-file-chunk');
    
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
            
            if (attachmentTimestamp) {
            } else {
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
    const userMessages = new Map(); // turnId -> userMessage
    
    try {
        // Find the scrollbar section
        const scrollbar = document.querySelector('ms-prompt-scrollbar');
        if (!scrollbar) {
            return userMessages;
        }
        
        // Find all scrollbar items with aria-label
        const scrollbarItems = scrollbar.querySelectorAll('.prompt-scrollbar-item button[aria-label][aria-controls]');
        
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
                }
            }
        });
        
        return userMessages;
        
    } catch (error) {
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
    return true;
}

// --- OSTATECZNA WERSJA: WSPINACZKA I ZBIERANIE DANYCH JEDNOCZEŚNIE ---
async function climbAndScrapeHistory() {
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
        
        
        // Check for cancellation
        if (analysisCancelled) {
          return scrapedHistory;
        }
        
        // Ustawiamy aktualny blok w widoku
        currentTurn.scrollIntoView({ block: 'center', behavior: 'smooth' });

        // Get turn ID for this turn
        const turnId = currentTurn.id;
        
        // Check if this turn contains only thinking content
        const hasOnlyThinking = isThinkingOnlyTurn(currentTurn);
        if (hasOnlyThinking) {
            // Skip this turn entirely - don't increment message numbers
        } else {
            // First try to extract content from the turn element itself
            const content = await extractTurnContent(currentTurn, userMessages);
            
            if (content && (content.richContent || content.textContent || content.attachments.length > 0)) {
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
                    
                    
                    // Validate critical data before storing
                    if (!content.richContent && !content.textContent) {
                    }
                    if (!turnId) {
                    }
                    
                    scrapedHistory.push({ 
                        role: role, 
                        richContent: content.richContent,
                        textContent: content.textContent,
                        attachments: content.attachments || [],
                        turnId: turnId // Store turn ID for branch navigation
                    });
                }
            }

        const previousTurn = currentTurn.previousElementSibling;
        if (!previousTurn || !previousTurn.matches(pageConfig.turnSelector)) {
            break;
        }
        currentTurn = previousTurn;
        turnIndex--;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    
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
  }
}

function sendAnalysisComplete() {
  // Send analysis complete signal only if popup is available (ignore if closed)
  safeSendToPopup({ action: 'analysisComplete' });
}

// Process scraped history into structured format - reusable by multiple functions
function processScrapedHistory(scrapedHistory, options = {}) {
  const { 
    includeInPrompt = true, 
    sendProgress = false,
    checkCancellation = false 
  } = options;
  
  const processedHistory = [];
  let historyForPrompt = "";
  let messageSequence = 0; // Only for prompt numbering, not for IDs

  scrapedHistory.forEach((message, index) => {
      // Check for cancellation if requested
      if (checkCancellation && analysisCancelled) {
        return;
      }
      
      // Send progress update if requested
      if (sendProgress) {
        sendProgressUpdate(index + 1);
      }
      
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
        return;
      }
      
      messageSequence++; // Only increment for non-thinking content (for prompt display)
      
      // For analysis prompts, replace content with placeholder but keep the message
      if (isAnalysisPrompt) {
        const placeholderText = "Chat history skipped because it was meant for the analysis prompt, no need to reflect to this content.";
        
        const processedMessage = { 
          turnId: message.turnId, // Use turnId as primary identifier
          role: message.role, 
          richContent: placeholderText,
          textContent: placeholderText,
          attachments: message.attachments || [], // Keep attachments if any
          isAnalysisPrompt: true // Mark as analysis prompt
        };
        
        processedHistory.push(processedMessage);
        
        if (includeInPrompt) {
          historyForPrompt += `MESSAGE ${messageSequence} [id: ${message.turnId || 'unknown'}] (${message.role}):\n${placeholderText}\n\n---\n\n`;
        }
      } else {
        // Regular message - include normally
        const processedMessage = { 
          turnId: message.turnId, // Use turnId as primary identifier
          role: message.role, 
          richContent: message.richContent,
          textContent: message.textContent,
          attachments: message.attachments || []
        };
        
        processedHistory.push(processedMessage);
        
        if (includeInPrompt) {
          // Use rich content (markdown) for the prompt, which preserves formatting
          let messageText = message.richContent || message.textContent;
          if (message.attachments && message.attachments.length > 0 && !messageText.includes('[ATTACHMENT:')) {
            const attachmentInfo = message.attachments.map(att => 
              `[ATTACHMENT: ${att.name} (${att.type})]`
            ).join('\n');
            messageText = attachmentInfo + (messageText ? '\n\n' + messageText : '');
          }
          
          historyForPrompt += `MESSAGE ${messageSequence} [id: ${message.turnId || 'unknown'}] (${message.role}):\n${messageText}\n\n---\n\n`;
        }
      }
  });
  
  return {
    processedHistory,
    historyForPrompt
  };
}

// Main analysis function
async function analyzeAndPrepare() {
  analysisCancelled = false;
  
  // Show progress overlay
  showProgressOverlay();
  updateProgressOverlay("Preparing analysis...", 5);
  
  // Check if user is at the bottom of the chat before starting
  const scrollCheck = checkIfAtBottomOfChat();
  
  if (scrollCheck.error) {
    hideProgressOverlay();
    return;
  }
  
  // Log position but don't block analysis - user has scroll button available
  if (!scrollCheck.isAtBottom) {
  } else {
  }
  
  updateProgressOverlay("Collecting chat history...", 15);
  const scrapedHistory = await climbAndScrapeHistory();
  
  updateProgressOverlay("Processing messages...", 60);
  
  if (scrapedHistory.length === 0) {
    hideProgressOverlay();
    return;
  }
  
  // Process the scraped history using the reusable function
  const { processedHistory, historyForPrompt } = processScrapedHistory(scrapedHistory, {
    includeInPrompt: true,
    sendProgress: true,
    checkCancellation: true
  });
  
  // Final cancellation check before saving
  if (analysisCancelled) {
    sendAnalysisComplete();
    return;
  }
  
  // No storage needed! Analysis results will be extracted from DOM when needed

  const dualPurposePrompt = `**TASK:** You are a conversation analysis AI that maps conversation branches like Git.

[TASK]
1.  Read the entire chat history provided below.
2.  Assign each message turn-id to a thematic branch (e.g., "Extension Debugging", "GitHub Repo").
3.  Output TWO code blocks: JSON (structured gitGraph) and Mermaid visualization.

=== OUTPUT FORMAT (STRICT) ===

Your response MUST contain exactly TWO code blocks in this order:

FIRST CODE BLOCK - JSON (structured gitGraph):
\`\`\`json
{
  "type": "gitGraph",
  "actions": [
    {
      "type": "commit",
      "branch": "main",
      "id": "turn-XXXX",
      "message": "Branch Name | Optional description",
      "branch_hint": "Branch Name"
    },
    {
      "type": "branch",
      "name": "New Branch Name",
      "from": "main"
    },
    {
      "type": "checkout",
      "name": "main"
    }
  ]
}
  Rules:
- JSON actions must include ALL messages with their exact turnIds
- Use "branch" and "checkout" actions to represent conversation flow
\`\`\`

SECOND CODE BLOCK - MERMAID gitGraph (no turnIds in Mermaid), example:
\`\`\`mermaid
gitGraph
    commit id: "Initial Context"
    commit id: "Framework Understood"

    branch "Paradigm Shifts"
    checkout "Paradigm Shifts"
    commit id: "3 Major Shifts Proposed"
    commit id: "Shifts Analyzed"
    checkout "main"
    merge "Paradigm Shifts"
    
    branch "TOFU Strategy"
    checkout "TOFU Strategy"
    commit id: "GAIO Plan"
    commit id: "Adapting GAIO"
    
    branch "Service Ladder"
    checkout "Service Ladder"
    commit id: "Program Proposed"
    commit id: "Ladder Validated"
    checkout "TOFU Strategy"
    commit id: "Platform Mapping"
    merge "Service Ladder"
    
    checkout "main"
    merge "TOFU Strategy"
    
    branch "Cursor Analysis"
    checkout "Cursor Analysis"
    commit id: "Initial Question"
    commit id: "Tornado Test on Cursor"
    
    branch "Marketing IDE Idea"
    checkout "Marketing IDE Idea"
    commit id: "Cursor for Marketing?"
    commit id: "Slack-First Strategy"
    commit id: "Platform Risk Raised"
    commit id: "Mattermost as OS Base"
    commit id: "Ecosystem Check"

    branch "Hacking Cursor"
    checkout "Hacking Cursor"
    commit id: "Using Cursor as Engine"
    checkout "Marketing IDE Idea"
    merge "Hacking Cursor"
    commit id: "API Feasibility Check"
    
    branch "Open Source Engine"
    checkout "Open Source Engine"
    commit id: "Quest for OSS Alt"
    commit id: "Continue.dev Identified"
    commit id: "Feasibility Check"
    checkout "Marketing IDE Idea"
    merge "Open Source Engine"
    
    checkout "main"
    merge "Marketing IDE Idea"
    
    branch "Internal OS Structure"
    checkout "Internal OS Structure"
    commit id: "Applying IDE Internally"
    commit id: "Customer-Centric Structure"
    
    checkout "main"
    merge "Internal OS Structure"
    commit id: "Final Output"

Rules:
- Mermaid should match the JSON structure but MUST COMPLY WITH MERMAID gitGraph SYNTAX
- Do NOT add any prose outside the code blocks

=== CHAT HISTORY TO ANALYZE ===

${historyForPrompt}

=== END OF INSTRUCTIONS ===`;
  
  updateProgressOverlay("Preparing analysis prompt...", 80);
  insertPrompt(dualPurposePrompt);
  
  updateProgressOverlay("Analysis prompt ready! Please click Send to run it.", 100);
  setTimeout(() => {
    hideProgressOverlay();
  }, 3000); // Keep overlay visible for 3 seconds to show completion
  
  // No need to watch - we'll detect and store when user opens popup next time 
}

// Helper function to store analysis turn-id when we detect it
function storeAnalysisTurnId(turnElement) {
  const chatId = getCurrentChatId();
  const turnId = turnElement.id;
  
  if (chatId && turnId) {
    chrome.storage.local.set({ 
      [`analysis_turn_${chatId}`]: turnId,
      [`analysis_completed_${chatId}`]: Date.now()
    });
    console.log(`Stored analysis turn reference: ${turnId} for chat ${chatId}`);
  }
}

// Extract JSON and Mermaid code text from AI Studio code panels (handles combined block)
function extractJsonAndMermaidFromDom(turnRoot) {
  try {
    const result = { json: null, mermaid: null };
    // First, prefer panels inside ms-code-block
    let panels = Array.from(turnRoot.querySelectorAll('ms-code-block .mat-expansion-panel'));
    // If none found, fall back to any expansion panel within the turn
    if (panels.length === 0) {
      panels = Array.from(turnRoot.querySelectorAll('.mat-expansion-panel'));
    }
    
    panels.forEach((panel, index) => {
      const titleEl = panel.querySelector('.mat-expansion-panel-header .mat-expansion-panel-header-title');
      // Get the text content, but exclude the icon text (like "code")
      let title = '';
      if (titleEl) {
        const spans = titleEl.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent.trim();
          // Skip icon text (usually single words like "code")
          if (text && text.length > 1 && !text.includes('code')) {
            title = text;
            break;
          }
        }
        // Fallback to full text content if no specific span found
        if (!title) {
          title = titleEl.textContent.trim();
        }
      }
      const codeEl = panel.querySelector('pre code');
      if (!codeEl) {
        return;
      }
      let code = codeEl.textContent || '';
      
      // Strip helper markers and zero-width spaces/highlights
      code = code.replace(/IGNORE_WHEN_COPYING_START[\s\S]*?IGNORE_WHEN_COPYING_END/g, '');
      code = code.replace(/\u200B/g, '');
      
      if (/^JSON$/i.test(title)) {
        // Find first balanced JSON object
        const json = extractFirstBalancedJson(code);
        if (json && !result.json) {
          result.json = json;
        }
        // Combined blocks are handled by separate Mermaid panels - no text parsing needed
      } else if (/^Mermaid$/i.test(title)) {
        if (!result.mermaid) {
          result.mermaid = code.replace(/```/g, '').trim();
        }
      }
    });
    
    // No text-based fallbacks - only use DOM-based extraction from expansion panels
    return result;
  } catch (error) {
    return { json: null, mermaid: null };
  }
}

// Brace-balanced JSON slice extractor
function extractFirstBalancedJson(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) {
      const slice = text.substring(start, i + 1);
      try { JSON.parse(slice); return slice; } catch (_) { return null; }
    }
  }
  return null;
}

// Helper function to get the latest analysis from DOM
function getLatestAnalysisFromDom() {
  determinePageConfiguration();
  
  if (!pageConfig.turnSelector) {
    return null;
  }

  // Find the last model turn that contains analysis results
  const allTurns = Array.from(document.querySelectorAll(pageConfig.turnSelector));
  
  if (allTurns.length === 0) {
    return null;
  }

  // Search from newest to oldest for a model turn with analysis data
  for (let i = allTurns.length - 1; i >= 0; i--) {
    const turn = allTurns[i];
    
    // Check if it's a model turn (not user turn)
    const isModelTurn = !turn.classList.contains('user');
    
    if (isModelTurn) {
      // Try to extract analysis data from this turn
      const domExtract = extractJsonAndMermaidFromDom(turn);
      if (domExtract && (domExtract.json || domExtract.mermaid)) {
        // Build branch map from JSON if available
        let branchMap = {};
        if (domExtract.json) {
          try {
            const gitGraph = JSON.parse(domExtract.json);
            if (gitGraph && gitGraph.type === 'gitGraph' && Array.isArray(gitGraph.actions)) {
              gitGraph.actions.forEach(action => {
                if (action && action.type === 'commit' && action.id) {
                  const turnId = String(action.id);
                  const branchName = String(action.branch_hint || action.branch || '').trim();
                  if (!branchName) {
                    return;
                  }
                  // Use turnId as key instead of sequential numbers
                  branchMap[turnId] = { thread: branchName, turnId };
                }
              });
            }
          } catch (e) {
            // JSON parsing failed, continue without branch map
          }
        }
        
        // Store the turn-id when we find analysis (this happens when popup opens)
        storeAnalysisTurnId(turn);
        
        return {
          json: domExtract.json,
          mermaid: domExtract.mermaid,
          branchMap: branchMap,
          hasData: true,
          turnId: turn.id
        };
      }
    }
  }
  
  return null;
}

// Function to load analysis from DOM (for popup compatibility)
async function loadAnalysis(showAlerts = true) {
  const analysis = getLatestAnalysisFromDom();
  
  if (analysis && analysis.hasData) {
    // Notify popup that analysis is available
    const chatId = getCurrentChatId();
    safeSendToPopup({ action: 'analysisCompleted', chatId });
    return { 
      hasJsonData: !!analysis.json, 
      hasMermaidData: !!analysis.mermaid 
    };
  } else {
    return { hasJsonData: false, hasMermaidData: false };
  }
}

async function openFilteredBranch(branchName) {
  const chatId = getCurrentChatId();
  if (!chatId) return;
  
  // Try to get analysis from current view first
  let analysis = getLatestAnalysisFromDom();
  
  // If not found in current view, scroll to bottom to find latest analysis
  if (!analysis || !analysis.branchMap) {
    scrollToBottomOfChat();
    // Wait for scroll to complete then try again
    await new Promise(resolve => setTimeout(resolve, 1000));
    analysis = getLatestAnalysisFromDom();
    
    if (!analysis || !analysis.branchMap) {
      return;
    }
  }
  
  const branchMap = analysis.branchMap;
  
  // Re-scrape and process current chat history for content
  const scrapedHistory = await climbAndScrapeHistory();
  if (scrapedHistory.length === 0) {
    return;
  }
  
  const { processedHistory } = processScrapedHistory(scrapedHistory, {
    includeInPrompt: false, // We don't need prompt format for branch copying
    sendProgress: false,
    checkCancellation: false
  });
  
  // Use the freshly processed history
  const chatHistory = processedHistory;
  
  const threadMessages = chatHistory.filter(message => {
    // Check if this message's turnId exists in the branch map
    const messageThreadData = branchMap[message.turnId];
    
    if (!messageThreadData || typeof messageThreadData !== 'object') {
      return false;
    }
    
    // Extract thread name from the stored object { thread: "...", turnId: "..." }
    const messageThread = messageThreadData.thread;
    
    return messageThread === branchName;
  });
  
  
  // FAIL FAST: Validate we found messages for this branch
  if (threadMessages.length === 0) {
    
    return;
  }
  
  // Find the first message of the selected thread to determine the branch point
  const firstThreadMessage = threadMessages[0];
  const branchPointTurnId = firstThreadMessage.turnId;
  
  // Get all messages from the selected thread (we don't need main branch context for copying)
  const contextMessages = [...threadMessages];
  
  // Sort messages chronologically by their position in the original chat
  // (We'll use the order they appear in chatHistory as the chronological order)
  const turnIdOrder = chatHistory.map(m => m.turnId);
  contextMessages.sort((a, b) => {
    const indexA = turnIdOrder.indexOf(a.turnId);
    const indexB = turnIdOrder.indexOf(b.turnId);
    return indexA - indexB;
  });
  
  
  // FAIL FAST: This should never happen if we have thread messages
  if (contextMessages.length === 0) {
    
    return;
  }

  // Create thread hierarchy information
  const threadInfo = {
    branchName: branchName,
    totalMessages: contextMessages.length,
    threadSpecificMessages: threadMessages.length,
    branchPoint: branchPointTurnId,
    originalChatLength: chatHistory.length
  };

  let filteredContent = `# Thread: ${branchName}\n\n`;
  filteredContent += `**Thread Context Information:**\n`;
  filteredContent += `- Selected Thread: ${threadInfo.branchName}\n`;
  filteredContent += `- Total messages in context: ${threadInfo.totalMessages}\n`;
  filteredContent += `- Thread-specific messages: ${threadInfo.threadSpecificMessages} messages\n`;
  filteredContent += `- Branch started at turn: ${threadInfo.branchPoint || 'N/A'}\n`;
  filteredContent += `- Original full chat length: ${threadInfo.originalChatLength} messages\n\n`;
  filteredContent += `---\n\n`;

  // Add all context messages from the selected thread
  let messageIndex = 1;
  for (const message of contextMessages) {
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
    
    filteredContent += `## Message ${messageIndex} (${message.role}) - ${branchName}\n**Turn ID:** ${message.turnId}\n\n${cleanContent}\n\n---\n\n`;
    messageIndex++;
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

  const finalContentForNewChat = `Please continue the conversation based on the following context, which is a complete thread from a previous chat including its main branch context. This contains ${threadInfo.totalMessages} messages total (${threadInfo.mainBranchMessages} from main branch context + ${threadInfo.threadSpecificMessages} from the selected "${branchName}" thread). The conversation branches at message ${threadInfo.branchPoint || 'N/A'}. Preserve the code formatting and structure:${attachmentNotice}\n\n${filteredContent}`;
  
  
  
  // Try to focus the document first
  if (document.hasFocus && !document.hasFocus()) {
    window.focus();
    document.body.focus();
  }
  
  // Use fallback method for content scripts
  copyToClipboardContentScript(finalContentForNewChat, branchName, threadInfo);
  
}

async function copyToClipboardContentScript(text, branchName, threadInfo) {
  // Try modern clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    console.log(`Branch "${branchName}" copied to clipboard`);
    alert(`The full history for the "${branchName}" thread has been copied to your clipboard. Please paste it into a new chat.`);
    return;
  } catch (err) {
    // Modern API failed, try legacy method
  }
  
  // Fallback to execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.zIndex = '9999';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      console.log(`Branch "${branchName}" copied to clipboard (fallback)`);
      alert(`The full history for the "${branchName}" thread has been copied to your clipboard. Please paste it into a new chat.`);
      return;
    }
  } catch (err) {
    // Both methods failed
  }
  
  console.error(`Failed to copy branch "${branchName}" to clipboard`);
  alert(`Failed to copy branch "${branchName}" to clipboard. Please try again.`);
}


function showManualCopyDialogContentScript(text, branchName, threadInfo) {
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
      <p><strong>Thread:</strong> "${branchName}" (${threadInfo.totalMessages} messages)</p>
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
  
}

async function goToBranch(branchName) {
  const chatId = getCurrentChatId();
  if (!chatId) return;
  
  const analysis = getLatestAnalysisFromDom();
  if (!analysis || !analysis.branchMap) return;
  
  // Step 1: Try to find turn-IDs from analysis that exist in current DOM
  const branchTurnIds = Object.keys(analysis.branchMap)
    .filter(turnId => analysis.branchMap[turnId].thread === branchName)
    .reverse(); // Start with newest first
  
  // Try direct navigation first
  for (const turnId of branchTurnIds) {
    const turnElement = document.getElementById(turnId);
    if (turnElement) {
      // Found it! Navigate directly
      turnElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      turnElement.style.transition = 'background-color 0.3s ease';
      turnElement.style.backgroundColor = '#fff3cd';
      setTimeout(() => {
        turnElement.style.backgroundColor = '';
      }, 2000);
      return; // Success, no need to climb
    }
  }
  
  // Step 2: If not found in current view, climb to find it
  // TODO: Implement targeted climbing that stops when target is found
  // For now, fall back to full scrape approach
  const scrapedHistory = await climbAndScrapeHistory();
  if (scrapedHistory.length === 0) return;
  
  const { processedHistory } = processScrapedHistory(scrapedHistory, {
    includeInPrompt: false,
    sendProgress: false,
    checkCancellation: false
  });
  
  const threadMessages = processedHistory.filter(message => {
    const messageThreadData = analysis.branchMap[message.turnId];
    return messageThreadData && messageThreadData.thread === branchName;
  });
  
  if (threadMessages.length === 0) return;
  
  const lastMessage = threadMessages[threadMessages.length - 1];
  const turnElement = document.getElementById(lastMessage.turnId);
  
  if (turnElement) {
    turnElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
    
    turnElement.style.transition = 'background-color 0.3s ease';
    turnElement.style.backgroundColor = '#fff3cd';
    setTimeout(() => {
      turnElement.style.backgroundColor = '';
    }, 2000);
  }
}

function insertPrompt(text) {
  const promptTextarea = document.querySelector('.prompt-input-wrapper textarea') || document.querySelector('ms-autosize-textarea textarea');
  if (promptTextarea) {
    promptTextarea.value = text;
    promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}