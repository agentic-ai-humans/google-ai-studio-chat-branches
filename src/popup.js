document.addEventListener('DOMContentLoaded', () => {
  // --- Elementy UI ---
  const mainView = document.getElementById('mainView');
  const mainTitle = document.getElementById('mainTitle');
  const filteringView = document.getElementById('filteringView');
  const incorrectDomainView = document.getElementById('incorrectDomainView');
  
  // Progress indicator elements
  const progressIndicator = document.getElementById('progressIndicator');
  const progressCounter = document.getElementById('progressCounter');
  const scrollProgress = document.getElementById('scrollProgress');
  const scrollCounter = document.getElementById('scrollCounter');
  const messageProgress = document.getElementById('messageProgress');
  const cancelAnalysisButton = document.getElementById('cancelAnalysisButton');
  const mainControls = document.getElementById('mainControls');
  
  const scrollToBottomButton = document.getElementById('scrollToBottomButton');
  const analyzeButton = document.getElementById('analyzeButton');
  const branchSelector = document.getElementById('branchSelector');
  const openBranchButton = document.getElementById('openBranchButton');
  const goToBranchButton = document.getElementById('goToBranchButton');
  const clearDataButton = document.getElementById('clearDataButton');
  const dataTimestamp = document.getElementById('dataTimestamp');
  
  // Mermaid section elements
  const mermaidSection = document.getElementById('mermaidSection');
  const dataManagementSection = document.getElementById('dataManagementSection');
  const copyJsonButton = document.getElementById('copyJsonButton');
  const copyMermaidButton = document.getElementById('copyMermaidButton');
  const showGraphButton = document.getElementById('showGraphButton');


  let activeTabId = null;
  let analysisInProgress = false;
  let analysisCancelled = false;
  
  // Storage for extracted data
  let extractedJsonData = null;
  let extractedMermaidData = null;

  // --- Progress Indicator Functions ---
  function showProgressIndicator() {
    analysisInProgress = true;
    analysisCancelled = false;
    
    // Check if all required elements exist
    if (!progressIndicator) {
      return;
    }
    if (!mainControls) {
      return;
    }
    progressIndicator.classList.remove('hidden');
    mainControls.classList.add('hidden');
    
    // Reset progress displays
    if (progressCounter) progressCounter.textContent = '0';
    if (scrollCounter) scrollCounter.textContent = '0/0';
    if (scrollProgress) scrollProgress.classList.add('hidden');  // Start with scroll progress hidden
    if (messageProgress) messageProgress.classList.remove('hidden');  // Show message progress initially
  }

  function hideProgressIndicator() {
    analysisInProgress = false;
    if (progressIndicator) {
      progressIndicator.classList.add('hidden');
    }
    if (mainControls) {
      mainControls.classList.remove('hidden');
    }
  }

  function updateProgressCounter(count) {
    if (progressCounter) {
      progressCounter.textContent = count.toString();
    }
  }

  function updateScrollProgress(current, total, phase) {
    if (scrollCounter) {
      scrollCounter.textContent = `${current}/${total}`;
    }
    
    // Show scroll progress and hide message progress during climbing
    if (phase === 'climbing') {
      scrollProgress.classList.remove('hidden');
      messageProgress.classList.add('hidden');
    } else {
      // Once climbing is done, hide scroll progress and show message progress
      scrollProgress.classList.add('hidden');
      messageProgress.classList.remove('hidden');
    }
  }

  function cancelAnalysis() {
    analysisCancelled = true;
    hideProgressIndicator();
  }

  // --- Data extraction is handled by content script only ---
  // All JSON/Mermaid extraction uses extractJsonAndMermaidFromDom() in content_script.js

  function copyToClipboard(text, type) {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopySuccess(type);
      }).catch(err => {
        fallbackCopyToClipboard(text, type);
      });
    } else {
      // Fallback for browsers without clipboard API
      fallbackCopyToClipboard(text, type);
    }
  }

  function fallbackCopyToClipboard(text, type) {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // Try to copy using execCommand (legacy method)
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        showCopySuccess(type);
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (err) {
      // Show manual copy dialog as last resort
      showManualCopyDialog(text, type);
    }
  }

  function showCopySuccess(type) {
    const button = type === 'json' ? copyJsonButton : copyMermaidButton;
    const originalText = button.textContent;
    button.textContent = '✅ Copied!';
    button.style.backgroundColor = '#27ae60';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = type === 'json' ? '#f39c12' : '#9b59b6';
    }, 2000);
  }

  function showManualCopyDialog(text, type) {
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
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        max-height: 400px;
        overflow: auto;
      ">
        <h3>Manual Copy Required</h3>
        <p>Please select all text below and copy manually (Ctrl+C / Cmd+C):</p>
        <textarea readonly style="
          width: 100%;
          height: 200px;
          font-family: monospace;
          font-size: 12px;
          margin: 10px 0;
        ">${text}</textarea>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        ">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-select the text
    const textarea = modal.querySelector('textarea');
    textarea.focus();
    textarea.select();
  }

  // --- STORAGE KEY CONSTANTS ---
  function getStorageKeys(chatId) {
    return {
      branchMap: `branch_map_${chatId}`,
      chatHistory: `chat_history_${chatId}`,
      jsonData: `json_data_${chatId}`,
      mermaidDiagram: `mermaid_diagram_${chatId}`,
      analysisCompleted: `analysis_completed_${chatId}`,
      dataCreated: `data_created_${chatId}`,
      dataCleared: `data_cleared_${chatId}`,
      selectedBranch: `selected_branch_${chatId}`,
      currentChatId: 'current_chat_id'
    };
  }

  // --- Główna funkcja inicjująca ---
  function initializePopup() {
    console.log('Initializing popup...');
    
    // Try multiple methods to get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        // Fallback: try to get any tab in the current window
        chrome.tabs.query({ currentWindow: true }, (allTabs) => {
          if (allTabs && allTabs.length > 0) {
            // Find the first AI Studio tab
            const aiStudioTab = allTabs.find(tab => tab.url && tab.url.includes("aistudio.google.com"));
            if (aiStudioTab) {
              activeTabId = aiStudioTab.id;
              console.log('Using AI Studio tab ID:', activeTabId, 'URL:', aiStudioTab.url);
              initializeForCorrectPage();
            } else {
              console.error('No AI Studio tabs found');
              showIncorrectDomain();
            }
          } else {
            console.error('No tabs found at all');
            showIncorrectDomain();
          }
        });
        return;
      }
      
      const firstTab = tabs[0];
      if (!firstTab) {
        showIncorrectDomain();
        return;
      }
      
      activeTabId = firstTab.id;
      const isCorrectPage = firstTab.url && firstTab.url.includes("aistudio.google.com");
      if (!isCorrectPage) {
        showIncorrectDomain();
        return;
      }
      
      initializeForCorrectPage();
    });
    
    function showIncorrectDomain() {
      mainTitle.classList.add('hidden');
      mainView.classList.add('hidden');
      incorrectDomainView.classList.remove('hidden');
    }
    
    function initializeForCorrectPage() {
      console.log('Popup: Checking current chat info...');
      // Get current chat info from content script
      sendMessageToContentScript({ action: 'getCurrentChatInfo' }, (response) => {
        if (response) {
          console.log('Popup: Response from content script:', response);
          
          // Handle pages that are not actual chats (no real chat ID)
          if (response.isNewChat || !response.chatId) {
            console.log('Popup: Not on a valid chat page - showing incorrect domain view');
            showIncorrectDomain();
            return;
          }
          
          console.log('Popup: Current chat ID:', response.chatId);
          console.log('Popup: Has analysis:', response.hasAnalysis);
          
          // AUTO-LOAD: Check for available data and load it automatically
          autoLoadAvailableData(response.chatId, response);
          
        } else {
          console.log('Popup: Could not get current chat info');
        }
      });
    }

    // New function to automatically load available data
    let isLoadingData = false;
    function autoLoadAvailableData(chatId, chatInfo) {
      if (isLoadingData) {
        return;
      }
      isLoadingData = true;
      
      // Check storage data first using standardized keys
      const keys = getStorageKeys(chatId);
      chrome.storage.local.get([
        keys.branchMap,
        keys.jsonData,
        keys.mermaidDiagram,
        keys.dataCreated,
        keys.dataCleared
      ], (storageData) => {
        
        const hasStoredBranchMap = !!storageData[keys.branchMap];
        const hasStoredJsonData = !!storageData[keys.jsonData];
        const hasStoredMermaidData = !!storageData[keys.mermaidDiagram];
        const hasStoredTimestamp = !!storageData[keys.dataCreated];
        const dataWasCleared = !!storageData[keys.dataCleared];
        
        
        // If we have storage data, use it
        if (hasStoredBranchMap || hasStoredJsonData || hasStoredMermaidData) {
          loadDataFromStorage(storageData, chatId);
        }
        
        // CRITICAL: Only extract from page if NO storage data exists at all
        if (!dataWasCleared && !hasStoredBranchMap && !hasStoredJsonData && !hasStoredMermaidData) {
          sendMessageToContentScript({ action: 'loadAnalysis' }, (pageResult) => {
            if (pageResult && (pageResult.hasJsonData || pageResult.hasMermaidData)) {
              // Fresh page data available, load it (this will override storage data)
              loadAnalysisDataFromPage();
            } else {
              hideAllDataSections();
            }
            
            // Reset loading flag
            isLoadingData = false;
          });
        } else {
          if (dataWasCleared) {
          } else {
          }
          
          if (!hasStoredBranchMap && !hasStoredJsonData && !hasStoredMermaidData) {
            hideAllDataSections();
          }
          
          // Reset loading flag
          isLoadingData = false;
        }
      });
    }

    function loadDataFromStorage(storageData, chatId) {
      // Prefer JSON to derive branch list (no dependency on branch_map)
      const keys = getStorageKeys(chatId);
      extractedJsonData = storageData[keys.jsonData] || null;
      extractedMermaidData = storageData[keys.mermaidDiagram] || null;
      
      console.log('POPUP: Loading data from storage for chatId:', chatId);
      console.log('POPUP: JSON data available:', !!extractedJsonData);
      console.log('POPUP: Mermaid data available:', !!extractedMermaidData);
      if (extractedMermaidData) {
        console.log('POPUP: Mermaid data preview:', extractedMermaidData.substring(0, 100) + '...');
      }

      let branchNames = [];
      if (extractedJsonData) {
        try {
          const json = JSON.parse(extractedJsonData);
          if (json && json.type === 'gitGraph' && Array.isArray(json.actions)) {
            const names = new Set();
            json.actions.forEach(action => {
              if (action && action.type === 'commit' && action.branch_hint) {
                names.add(String(action.branch_hint).trim());
              }
              if (action && action.type === 'branch' && action.name) {
                names.add(String(action.name).trim());
              }
            });
            branchNames = Array.from(names).filter(n => n && n.toLowerCase() !== 'gitgraph');
          }
        } catch (e) {
          console.error('Failed to parse structured JSON for branch list:', e);
        }
      }

      if (branchNames.length > 0) {
        populateBranchSelector(branchNames);
        filteringView.classList.remove('hidden');
        dataManagementSection.classList.remove('hidden');
      }
      
      // If we have branch data, always show the visualization section
      // (even if no JSON/Mermaid data yet - user can generate it)
      if (extractedJsonData || extractedMermaidData || storageData[keys.branchMap]) {
        
        mermaidSection.classList.remove('hidden');
        // dataManagementSection already shown above if we have branch data
      }
      
      // Show timestamp
      if (storageData[keys.dataCreated]) {
        const timestamp = new Date(storageData[keys.dataCreated]);
        dataTimestamp.textContent = `Data created: ${timestamp.toLocaleString()}`;
      }
      
      // Hide the analyze button when data is loaded
      analyzeButton.style.display = 'none';
    }

    function loadAnalysisDataFromPage() {
      // Use the existing load analysis button logic but without user interaction
      
      sendMessageToContentScript({ action: 'loadAnalysis' }, () => {
        sendMessageToContentScript({ action: 'getCurrentChatInfo' }, (response) => {
          if (response && response.chatId) {
            // Load ALL necessary data, not just JSON and Mermaid
            const keys = getStorageKeys(response.chatId);
            chrome.storage.local.get([
              keys.branchMap,
              keys.chatHistory,
              keys.jsonData,
              keys.mermaidDiagram,
              keys.dataCreated
            ], (result) => {
              // Use the same loading logic as loadDataFromStorage
              loadDataFromStorage(result, response.chatId);
            });
          }
        });
      });
    }

  function hideAllDataSections() {
    filteringView.classList.add('hidden');
    mermaidSection.classList.add('hidden');
    dataManagementSection.classList.add('hidden');
    dataTimestamp.textContent = '';
    // Show the analyze button when no data is available
    analyzeButton.style.display = 'block';
  }


  function calculateBranchInfo(branchNames, branchMap, chatHistory) {
    const branches = [];
    
    // Determine main branch (most common branch name)
    const branchCounts = {};
    Object.values(branchMap).forEach(item => {
      const branch = item ? item.thread : null;
      if (branch) {
        branchCounts[branch] = (branchCounts[branch] || 0) + 1;
      }
    });
    const mainBranch = Object.keys(branchCounts).reduce((a, b) => branchCounts[a] > branchCounts[b] ? a : b);
    
    branchNames.forEach(branchName => {
      const isMain = branchName === mainBranch;
      const lastMessage = getLastMessageForBranch(branchName, branchMap, chatHistory);
      const messagePositions = getMessagePositionsForBranch(branchName, branchMap);
      const mainPositions = getMessagePositionsForBranch(mainBranch, branchMap);
      
      // Calculate ahead/behind relative to main branch
      let aheadBehind = 0;
      if (!isMain) {
        const lastMainPosition = Math.max(...mainPositions);
        const lastBranchPosition = Math.max(...messagePositions);
        aheadBehind = lastBranchPosition - lastMainPosition;
      }
      
      branches.push({
        name: branchName,
        isMain: isMain,
        lastMessage: lastMessage,
        messageCount: messagePositions.length,
        aheadBehind: aheadBehind,
        lastPosition: Math.max(...messagePositions)
      });
    });
    
    return branches;
  }

  function getLastMessageForBranch(branchName, branchMap, chatHistory) {
    // Find the last message in this branch
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const messageNum = i + 1;
      const messageThreadData = branchMap[messageNum];
      // Extract thread name from the stored object { thread: "...", turnId: "..." }
      const messageThread = messageThreadData ? messageThreadData.thread : null;
      if (messageThread === branchName) {
        return chatHistory[i];
      }
    }
    return null;
  }

  function getMessagePositionsForBranch(branchName, branchMap) {
    const positions = [];
    Object.keys(branchMap).forEach(messageNum => {
      const item = branchMap[messageNum];
      const branch = item ? item.thread : null;
      if (branch === branchName) {
        positions.push(parseInt(messageNum));
      }
    });
    return positions;
  }

  function sortBranchesGitStyle(branches) {
    
    const sorted = branches.sort((a, b) => {
      // Main branch first
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      
      // Then by last activity (most recent first)
      return b.lastPosition - a.lastPosition;
    });
    
    
    return sorted;
  }

  function formatBranchOption(branch) {
    const prefix = branch.isMain ? '* ' : '  ';
    const lastCommit = branch.lastMessage ? 
      (branch.lastMessage.textContent || branch.lastMessage.richContent || 'Latest message').substring(0, 50) + '...' : 
      'No messages';
    
    let suffix = '';
    if (branch.isMain) {
      suffix = ' (current)';
    } else if (branch.aheadBehind > 0) {
      suffix = ` (+${branch.aheadBehind})`;
    } else if (branch.aheadBehind < 0) {
      suffix = ` (${branch.aheadBehind})`;
    }
    
    return `${prefix}${branch.name} / ${lastCommit}${suffix}`;
  }

  function populateBranchSelector(branchNames) {
    branchSelector.innerHTML = ''; // Clear the list

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a branch...';
    branchSelector.appendChild(defaultOption);
    
    // Get chatId and branch map to calculate branch info
    sendMessageToContentScript({ action: 'getCurrentChatInfo' }, (response) => {
      if (response && response.chatId) {
        const keys = getStorageKeys(response.chatId);
        chrome.storage.local.get([keys.branchMap, keys.chatHistory, keys.selectedBranch], (result) => {
          const branchMap = result[keys.branchMap];
          const chatHistory = result[keys.chatHistory];
          const savedBranch = result[keys.selectedBranch];
          
          
          if (branchMap && chatHistory) {
            const branchInfo = calculateBranchInfo(branchNames, branchMap, chatHistory);
            
            // Sort branches by git-style priority (main first, then by activity)
            const sortedBranches = sortBranchesGitStyle(branchInfo);
            
            sortedBranches.forEach((branch, index) => {
              const option = document.createElement('option');
              option.value = branch.name;
              option.textContent = formatBranchOption(branch);
              branchSelector.appendChild(option);
            });
            
            // Restore previously selected branch
            if (savedBranch && branchNames.includes(savedBranch)) {
              branchSelector.value = savedBranch;
              console.log('Restored selected branch:', savedBranch);
            }
          } else {
            // FAIL FAST: Don't silently degrade functionality
            console.error('CRITICAL ERROR: Branch data missing!', {
              hasBranchNames: branchNames.length > 0,
              hasBranchMap: !!branchMap,
              hasChatHistory: !!chatHistory,
              storageKeys: Object.keys(result),
              expectedKeys: [keys.branchMap, keys.chatHistory]
            });
            
            // Show error to user instead of broken functionality
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = '❌ Error: Branch data missing - please re-run analysis';
            errorOption.style.color = '#e74c3c';
            branchSelector.appendChild(errorOption);
            
            console.error('Branch selector degraded to error state - Go to Branch will not work');
          }
        });
      }
    });
  }

  // Helper function to safely send messages to content script
  function sendMessageToContentScript(message, callback) {
    if (!activeTabId) {
      console.error('No active tab ID available');
      console.error('No AI Studio tab found');
      return;
    }
    
    // First check if the tab is still valid
    chrome.tabs.get(activeTabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Tab no longer exists:', chrome.runtime.lastError);
        console.error('AI Studio tab was closed');
        return;
      }
      
      // Check if it's still an AI Studio tab
      if (!tab.url || !tab.url.includes("aistudio.google.com")) {
        console.error('Not on AI Studio chat page');
        return;
      }
      
      // Send the message
      chrome.tabs.sendMessage(activeTabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError.message || chrome.runtime.lastError);
          console.error('Content script not loaded');
          return;
        }
        if (callback) callback(response);
      });
    });
  }

  // --- Event Listeners ---
  
  scrollToBottomButton.addEventListener('click', () => {
    sendMessageToContentScript({ action: 'scrollToBottom' }, (response) => {
      if (response && response.status === 'ok') {
        // Don't close popup, let user see the scroll happened and then analyze
        console.log('Scrolled to bottom successfully');
      }
    });
  });

  analyzeButton.addEventListener('click', (event) => {
    console.log('=== ANALYZE BUTTON CLICKED ===');
    
    // Prevent default behavior and event bubbling
    event.preventDefault();
    event.stopPropagation();
    
    // Prevent multiple simultaneous analyses
    if (analysisInProgress) {
      console.log('Analysis already in progress, ignoring click');
      return;
    }
    
    console.log('Starting analysis...');
    
    // Get current chat info first, then clear only that chat's data
    sendMessageToContentScript({ action: 'getCurrentChatInfo' }, (response) => {
      if (response && response.chatId) {
        
        // Clear only the current chat's data before new analysis
        chrome.storage.local.remove([
          `chat_history_${response.chatId}`, 
          `branch_map_${response.chatId}`, 
          `analysis_completed_${response.chatId}`, 
          `data_created_${response.chatId}`,
          `json_data_${response.chatId}`,
          `mermaid_diagram_${response.chatId}`,
          'current_chat_id'
        ]);
        
        // Clear extracted data variables
        extractedJsonData = null;
        extractedMermaidData = null;
        mermaidSection.classList.add('hidden');
        
        // Close the popup and start analysis
        console.log('Closing popup and starting analysis...');
        
        // Start analysis with progress tracking
        sendMessageToContentScript({ action: 'analyzeAndPrepare' }, (analysisResponse) => {
          console.log('Analysis completed successfully');
          // Analysis complete - user can reopen popup to see results
        });
        
        // Close the popup after starting the analysis
        window.close();
      } else {
        console.log('Not on a valid AI Studio chat page');
      }
    });
  });

  // Cancel analysis button event listener
  cancelAnalysisButton.addEventListener('click', () => {
    sendMessageToContentScript({ action: 'cancelAnalysis' }, () => {
      cancelAnalysis();
    });
  });

  // Copy button event listeners
  copyJsonButton.addEventListener('click', () => {
    if (extractedJsonData) {
      copyToClipboard(extractedJsonData, 'json');
    } else {
      console.log('No JSON data available to copy');
    }
  });

  copyMermaidButton.addEventListener('click', () => {
    console.log('POPUP: Copy Mermaid clicked');
    const mermaidToCopy = getMermaidContent();
    
    if (mermaidToCopy) {
      copyToClipboard(mermaidToCopy, 'mermaid');
    } else {
      console.log('No Mermaid diagram available to copy');
    }
  });

  // Unified Mermaid extraction - handles all cases reliably
  function getMermaidContent() {
    // Priority 1: Direct stored Mermaid data (most reliable)
    if (extractedMermaidData && extractedMermaidData.trim()) {
      console.log('POPUP: Using stored Mermaid data');
      return extractedMermaidData.trim();
    }
    
    // No text-based fallbacks - only use DOM-extracted data from content script
    
    console.log('POPUP: No Mermaid content available');
    return null;
  }

  // Create proper mermaid.live URL using pako compression
  function createMermaidLiveURL(mermaidCode) {
    try {
      // Step 1: Wrap the Mermaid code into a JSON payload
      const payload = {
        code: mermaidCode,
        mermaid: {
          theme: 'default'
        }
      };

      // Step 2: Convert the JSON object to a UTF-8 encoded string
      const jsonString = JSON.stringify(payload);

      // Step 3: Compress the UTF-8 string using zlib (Pako)
      const compressed = pako.deflate(jsonString, { level: 9 });

      // Step 4: Base64-URL encode the compressed data
      // Convert Uint8Array to string for btoa
      const binaryString = String.fromCharCode.apply(null, compressed);
      const base64 = btoa(binaryString);
      
      // Make it URL-safe: replace + with -, / with _, and remove padding
      const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      // Step 5: Construct the Mermaid Live URL
      return `https://mermaid.live/edit#pako:${base64Url}`;
    } catch (error) {
      console.error('Error creating Mermaid Live URL:', error);
      throw error;
    }
  }

  showGraphButton.addEventListener('click', () => {
    console.log('POPUP: Show Graph clicked');
    const mermaidToShow = getMermaidContent();
    
    if (!mermaidToShow) {
      console.log('No Mermaid diagram available to show');
      return;
    }
    
    try {
      // Create proper mermaid.live URL using pako compression
      const url = createMermaidLiveURL(mermaidToShow);
      console.log('POPUP: Opening mermaid.live with pako-compressed data');
      chrome.tabs.create({ url });
    } catch (err) {
      console.warn('Failed to open mermaid.live with pako compression. Falling back to clipboard.');
      chrome.tabs.create({ url: 'https://mermaid.live/edit' });
      copyToClipboard(mermaidToShow, 'mermaid');
    }
  });

  // Listen for progress updates from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateProgress') {
      updateProgressCounter(request.count);
      sendResponse({ success: true });
    } else if (request.action === 'updateScrollProgress') {
      updateScrollProgress(request.current, request.total, request.phase);
      sendResponse({ success: true });
    } else if (request.action === 'analysisComplete') {
      hideProgressIndicator();
      sendResponse({ success: true });
    }
  });


  openBranchButton.addEventListener('click', () => {
    const selectedBranch = branchSelector.value;
    if (selectedBranch) {
      sendMessageToContentScript({ action: 'openBranchInNewChat', branchName: selectedBranch }, () => {
        console.log('Branch copied to clipboard successfully');
        // DON'T delete data - user might want to copy other branches or use Go to Branch
        // Data should persist until user manually clears it or runs new analysis
        
        // Close popup after successful branch copying with a small delay
        setTimeout(() => window.close(), 500);
      });
    }
  });

  goToBranchButton.addEventListener('click', () => {
    const selectedBranch = branchSelector.value;
    if (selectedBranch) {
      console.log('=== GO TO BRANCH CLICKED ===');
      console.log('Selected branch:', selectedBranch);
      console.log('Sending goToBranch message to content script...');
      sendMessageToContentScript({ action: 'goToBranch', branchName: selectedBranch }, (response) => {
        console.log('Branch navigation response:', response);
        // Close popup after successful navigation
        window.close();
      });
    } else {
      console.log('No branch selected for branch navigation');
    }
  });

  // Function to clear data
  function clearAllData() {
    console.log('Clear data function called');
    // Get current chat info to clear only that chat's data
    sendMessageToContentScript({ action: 'getCurrentChatInfo' }, (response) => {
      if (response && response.chatId) {
        console.log('Current chat ID:', response.chatId);
        if (confirm('Are you sure you want to clear all analysis data for this chat?')) {
          chrome.storage.local.remove([
            `chat_history_${response.chatId}`, 
            `branch_map_${response.chatId}`, 
            `analysis_completed_${response.chatId}`, 
            `data_created_${response.chatId}`,
            `json_data_${response.chatId}`,
            `mermaid_diagram_${response.chatId}`,
            `selected_branch_${response.chatId}`,
            'current_chat_id'
          ], () => {
            // Set a flag to prevent auto-reloading from page after manual clear
            chrome.storage.local.set({ [`data_cleared_${response.chatId}`]: Date.now() }, () => {
              console.log('Data cleared flag set for chat:', response.chatId);
            });
          });
          
          filteringView.classList.add('hidden');
          mermaidSection.classList.add('hidden');
          dataManagementSection.classList.add('hidden');
          dataTimestamp.textContent = '';
          
          // Show the analyze button when data is cleared
          analyzeButton.style.display = 'block';
          
          // Clear extracted data variables
          extractedJsonData = null;
          extractedMermaidData = null;
          console.log('Analysis data cleared successfully');
        }
      } else {
        console.log('No data to clear for this chat');
      }
    });
  }

  clearDataButton.addEventListener('click', clearAllData);

  // Save selected branch when it changes
  branchSelector.addEventListener('change', () => {
    const selectedBranch = branchSelector.value;
    if (selectedBranch) {
      // Get chatId from content script first
      sendMessageToContentScript({ action: 'getCurrentChatInfo' }, (response) => {
        if (response && response.chatId) {
          chrome.storage.local.set({ [`selected_branch_${response.chatId}`]: selectedBranch }, () => {
            console.log('Saved selected branch:', selectedBranch);
          });
        }
      });
    }
  });

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateBranchDropdown') {
      // NOTE: Branch dropdown is now populated by loadDataFromStorage with proper sorting
      // populateBranchSelector(request.branchNames); // REMOVED - this was overriding the sorted dropdown
      filteringView.classList.remove('hidden');
      dataManagementSection.classList.remove('hidden');
      
      // Show timestamp
      if (request.timestamp) {
        const timestamp = new Date(request.timestamp);
        dataTimestamp.textContent = `Data created: ${timestamp.toLocaleString()}`;
      }
      
      sendResponse({ status: 'ok' });
    } else if (request.action === 'analysisCompleted') {
      // New analysis data is available, reload the popup data
      console.log('POPUP: Analysis completed, reloading data for chatId:', request.chatId);
      autoLoadAvailableData(request.chatId, { chatId: request.chatId, hasAnalysis: true });
      sendResponse({ status: 'ok' });
    }
  });
  }

  initializePopup();
});
