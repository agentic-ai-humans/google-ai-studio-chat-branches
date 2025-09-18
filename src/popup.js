document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  const mainView = document.getElementById('mainView');
  const mainTitle = document.getElementById('mainTitle');
  const filteringView = document.getElementById('filteringView');
  const incorrectDomainView = document.getElementById('incorrectDomainView');
  const mainControls = document.getElementById('mainControls');
  const scrollToBottomButton = document.getElementById('scrollToBottomButton');
  const analyzeButton = document.getElementById('analyzeButton');
  const branchSelector = document.getElementById('branchSelector');
  const openBranchButton = document.getElementById('openBranchButton');
  const goToBranchButton = document.getElementById('goToBranchButton');
  const mermaidSection = document.getElementById('mermaidSection');
  const copyJsonButton = document.getElementById('copyJsonButton');
  const copyMermaidButton = document.getElementById('copyMermaidButton');
  const showGraphButton = document.getElementById('showGraphButton');

  let activeTabId = null;
  
  // Current analysis data (extracted from DOM)
  let currentAnalysisData = null;
  let currentChatInfo = null;

  // --- Button Management Functions ---
  function disableAllButtons() {
    // Main control buttons
    if (scrollToBottomButton) {
      scrollToBottomButton.disabled = true;
      scrollToBottomButton.style.opacity = '0.5';
      scrollToBottomButton.style.cursor = 'not-allowed';
    }
    if (analyzeButton) {
      analyzeButton.disabled = true;
      analyzeButton.style.opacity = '0.5';
      analyzeButton.style.cursor = 'not-allowed';
    }
    
    // Branch control buttons
    if (branchSelector) {
      branchSelector.disabled = true;
      branchSelector.style.opacity = '0.5';
    }
    if (openBranchButton) {
      openBranchButton.disabled = true;
      openBranchButton.style.opacity = '0.5';
      openBranchButton.style.cursor = 'not-allowed';
    }
    if (goToBranchButton) {
      goToBranchButton.disabled = true;
      goToBranchButton.style.opacity = '0.5';
      goToBranchButton.style.cursor = 'not-allowed';
    }
    
    // Mermaid section buttons
    if (copyJsonButton) {
      copyJsonButton.disabled = true;
      copyJsonButton.style.opacity = '0.5';
      copyJsonButton.style.cursor = 'not-allowed';
    }
    if (copyMermaidButton) {
      copyMermaidButton.disabled = true;
      copyMermaidButton.style.opacity = '0.5';
      copyMermaidButton.style.cursor = 'not-allowed';
    }
    if (showGraphButton) {
      showGraphButton.disabled = true;
      showGraphButton.style.opacity = '0.5';
      showGraphButton.style.cursor = 'not-allowed';
    }
    
    console.log('All buttons disabled during operation');
  }

  function enableAllButtons() {
    // Main control buttons
    if (scrollToBottomButton) {
      scrollToBottomButton.disabled = false;
      scrollToBottomButton.style.opacity = '1';
      scrollToBottomButton.style.cursor = 'pointer';
    }
    if (analyzeButton) {
      analyzeButton.disabled = false;
      analyzeButton.style.opacity = '1';
      analyzeButton.style.cursor = 'pointer';
    }
    
    // Branch control buttons
    if (branchSelector) {
      branchSelector.disabled = false;
      branchSelector.style.opacity = '1';
    }
    if (openBranchButton) {
      openBranchButton.disabled = false;
      openBranchButton.style.opacity = '1';
      openBranchButton.style.cursor = 'pointer';
    }
    if (goToBranchButton) {
      goToBranchButton.disabled = false;
      goToBranchButton.style.opacity = '1';
      goToBranchButton.style.cursor = 'pointer';
    }
    
    // Mermaid section buttons
    if (copyJsonButton) {
      copyJsonButton.disabled = false;
      copyJsonButton.style.opacity = '1';
      copyJsonButton.style.cursor = 'pointer';
    }
    if (copyMermaidButton) {
      copyMermaidButton.disabled = false;
      copyMermaidButton.style.opacity = '1';
      copyMermaidButton.style.cursor = 'pointer';
    }
    if (showGraphButton) {
      showGraphButton.disabled = false;
      showGraphButton.style.opacity = '1';
      showGraphButton.style.cursor = 'pointer';
    }
    
    console.log('All buttons re-enabled after operation');
  }

  // --- Operation Detection Functions ---
  function checkForActiveOperation(callback) {
    sendMessageToContentScript({ action: 'checkProgressOverlay' }, (response) => {
      const hasActiveOperation = response && response.hasActiveOverlay;
      console.log('Active operation check:', hasActiveOperation);
      callback(hasActiveOperation);
    });
  }

  function showOperationInProgressMessage() {
    // Remove any existing operation messages first
    const existingMessages = document.querySelectorAll('.operation-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create operation in progress message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'operation-message';
    messageDiv.style.cssText = `
      background-color: #f39c12;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      text-align: center;
      font-size: 0.9em;
      border: 2px solid #e67e22;
    `;
    
    messageDiv.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">
        ⏳ Operation in Progress
      </div>
      <div style="font-size: 0.85em; line-height: 1.4;">
        An operation is currently running. Please wait for it to complete before using the extension.
      </div>
    `;
    
    // Insert at the top of mainView
    const mainView = document.getElementById('mainView');
    if (mainView && mainView.firstChild) {
      mainView.insertBefore(messageDiv, mainView.firstChild);
    }
  }

  // UC-13: Check for page refresh by comparing stored turn-ids with current DOM
  function checkForPageRefresh(chatId, callback) {
    if (!chatId) {
      callback(false);
      return;
    }
    
    sendMessageToContentScript({ action: 'getAnalysisData' }, (response) => {
      if (response && response.hasData && response.source === 'cache') {
        // We have cached data, check if stored turn-ids still exist
        chrome.storage.local.get([`analysis_data_${chatId}`], (data) => {
          const cachedData = data[`analysis_data_${chatId}`];
          if (cachedData && cachedData.currentTurnIds) {
            // Check if any of the stored turn-ids exist in current DOM
            sendMessageToContentScript({ 
              action: 'checkTurnIdsExist', 
              turnIds: cachedData.currentTurnIds 
            }, (checkResponse) => {
              const refreshDetected = !(checkResponse && checkResponse.anyExist);
              callback(refreshDetected);
            });
          } else {
            callback(false); // No stored turn-ids to check
          }
        });
      } else {
        callback(false); // No cached data or data is from DOM (fresh)
      }
    });
  }

  // UC-13: Show refresh detection modal
  function showRefreshDetectionModal(chatId) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'refresh-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    modal.innerHTML = `
      <div style="
        background: #2c3e50;
        color: #ecf0f1;
        padding: 25px;
        border-radius: 10px;
        max-width: 280px;
        text-align: center;
        border: 2px solid #3498db;
      ">
        <div style="margin-bottom: 15px; font-size: 16px; font-weight: bold; color: #3498db;">
          🔄 Page Refresh Detected
        </div>
        <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.4;">
          Page was refreshed and chat IDs changed. Click 'Refresh Mappings' to update the analysis data.
        </div>
        <button id="refreshMappingsBtn" style="
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-right: 10px;
        ">Refresh Mappings</button>
        <button id="cancelRefreshBtn" style="
          background: #95a5a6;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle button clicks
    modal.querySelector('#refreshMappingsBtn').addEventListener('click', () => {
      modal.remove();
      // Trigger analysis to refresh mappings
      sendMessageToContentScript({ action: 'analyzeAndPrepare' });
      window.close(); // Close popup to show progress overlay
    });
    
    modal.querySelector('#cancelRefreshBtn').addEventListener('click', () => {
      modal.remove();
      // Continue with normal initialization but navigation won't work
      proceedWithNormalInitialization();
    });
  }

  // --- Helper Functions ---
  function sendMessageToContentScript(message, callback) {
    if (!activeTabId) {
      console.error('No active tab ID available');
      return;
    }
    
    chrome.tabs.sendMessage(activeTabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError.message);
        return;
      }
      if (callback) callback(response);
    });
  }


  function exportToFile(text, type, extension = 'txt') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `chat-${type.toLowerCase()}-${timestamp}.${extension}`;
      
      // Create blob with the content
      const blob = new Blob([text], { type: 'text/plain' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`${type} exported to file: ${filename}`);
    } catch (err) {
      console.error(`Failed to export ${type} to file:`, err);
      alert(`Failed to export ${type} to file. Please try again.`);
    }
  }

  function populateBranchSelector(analysisData) {
    if (!branchSelector || !analysisData.branchMap) return;
    
    branchSelector.innerHTML = '<option value="">Select a branch...</option>';
    
    // Get branch names with counts and latest message index from the branch map
    const branchCounts = {};
    const branchLatestIndex = {};
    
    Object.entries(analysisData.branchMap).forEach(([turnId, data]) => {
      if (data && data.thread) {
        const branchName = data.thread;
        branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
        
        // Extract numeric index from turnId (e.g., "turn-12345" -> 12345)
        // This assumes turnIds have a numeric component that reflects chronological order
        const turnMatch = turnId.match(/(\d+)$/);
        if (turnMatch) {
          const turnIndex = parseInt(turnMatch[1], 10);
          branchLatestIndex[branchName] = Math.max(branchLatestIndex[branchName] || 0, turnIndex);
        }
      }
    });
    
    // Sort by most recent activity (highest turn index first), fallback to alphabetical
    const sortedBranches = Object.keys(branchCounts).sort((a, b) => {
      const indexA = branchLatestIndex[a] || 0;
      const indexB = branchLatestIndex[b] || 0;
      
      // Primary sort: by most recent activity (descending)
      if (indexB !== indexA) {
        return indexB - indexA;
      }
      
      // Secondary sort: alphabetical (ascending) for branches with same recency
      return a.localeCompare(b);
    });
    
    // Add sorted branches to selector with message counts
    sortedBranches.forEach(branchName => {
      const option = document.createElement('option');
      option.value = branchName;
      const count = branchCounts[branchName];
      option.textContent = `${branchName} (${count} message${count > 1 ? 's' : ''})`;
      branchSelector.appendChild(option);
    });
  }

  function loadAnalysisData() {
    sendMessageToContentScript({ action: 'getAnalysisData' }, (response) => {
      if (response && response.hasData) {
        console.log(`Analysis data found (source: ${response.source})`);
        currentAnalysisData = {
          jsonData: response.jsonData,
          mermaidData: response.mermaidData,
          branchMap: response.branchMap
        };
        
        // UC-04 & UC-05: Analysis available (visible or cached) - show all features
        if (Object.keys(response.branchMap || {}).length > 0) {
          filteringView.classList.remove('hidden');
          populateBranchSelector(currentAnalysisData);
        }
        
        if (response.jsonData || response.mermaidData) {
          mermaidSection.classList.remove('hidden');
        }
        
        // UC-05: If data came from cache and analysis is not visible, show Find Analysis option
        if (response.source === 'cache' && currentChatInfo && !currentChatInfo.analysisTurnFound) {
          showAnalysisNotFoundOptions();
        }
        
        // Keep analyze button visible - users might want to run new analysis
      } else {
        console.log('No analysis data found');
        
        // UC-06: Check if we have stored analysis that's corrupted or not visible
        if (currentChatInfo && currentChatInfo.storedTurnId) {
          if (!currentChatInfo.analysisTurnFound) {
            // Analysis exists in storage but not found in DOM
            showAnalysisNotFoundOptions();
          } else if (!currentChatInfo.hasAnalysis) {
            // Analysis found in DOM but corrupted
            showCorruptedAnalysisOptions();
          }
        }
        
        // UC-03: No analysis found and no stored reference - hide analysis features (basic mode)
        filteringView.classList.add('hidden');
        mermaidSection.classList.add('hidden');
      }
    });
  }

  function showAnalysisNotFoundOptions() {
    // Remove any existing analysis messages first
    const existingMessages = document.querySelectorAll('.analysis-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create a temporary message with options
    const messageDiv = document.createElement('div');
    messageDiv.className = 'analysis-message';
    messageDiv.style.cssText = `
      background-color: #f39c12;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      text-align: center;
      font-size: 0.9em;
    `;
    
    messageDiv.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">
        Analysis exists but not visible in current view
      </div>
      <div style="margin-top: 10px;">
        <button id="searchAnalysisBtn" style="
          background-color: #2ecc71; 
          color: white; 
          border: none; 
          padding: 10px 16px; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 0.9em;
          width: 100%;
        ">Find Analysis</button>
      </div>
    `;
    
    // Insert before the analyze button
    analyzeButton.parentNode.insertBefore(messageDiv, analyzeButton);
    
    // Add event listeners
    messageDiv.querySelector('#searchAnalysisBtn').addEventListener('click', () => {
      sendMessageToContentScript({ action: 'scrollToAnalysis' }, (response) => {
        if (response && response.status === 'found') {
          window.close(); // Close popup after successful navigation
        } else if (response && response.status === 'corrupted') {
          alert('Analysis data is corrupted, please run new analysis');
          messageDiv.remove();
        } else {
          alert('Could not find the analysis. It may have been deleted.');
          messageDiv.remove();
        }
      });
    });
  }

  function showCorruptedAnalysisOptions() {
    // Remove any existing analysis messages first
    const existingMessages = document.querySelectorAll('.analysis-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create a temporary message for corrupted analysis
    const messageDiv = document.createElement('div');
    messageDiv.className = 'analysis-message';
    messageDiv.style.cssText = `
      background-color: #e74c3c;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      text-align: center;
      font-size: 0.9em;
    `;
    
    messageDiv.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">
        Analysis data is corrupted
      </div>
      <div style="margin-bottom: 10px; font-size: 0.8em;">
        The analysis exists but contains invalid data.
      </div>
      <div style="margin-top: 10px;">
        <button id="newAnalysisBtn" style="
          background-color: #3498db; 
          color: white; 
          border: none; 
          padding: 10px 16px; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 0.9em;
          width: 100%;
        ">Run New Analysis</button>
      </div>
    `;
    
    // Insert before the analyze button
    analyzeButton.parentNode.insertBefore(messageDiv, analyzeButton);
    
    // Add event listeners
    messageDiv.querySelector('#newAnalysisBtn').addEventListener('click', () => {
      // Trigger new analysis
      sendMessageToContentScript({ action: 'analyzeAndPrepare' });
      window.close();
    });
  }

  // --- Event Listeners ---
  
  // Scroll to bottom
  scrollToBottomButton?.addEventListener('click', () => {
    sendMessageToContentScript({ action: 'scrollToBottom' });
  });

  // Analyze button
  analyzeButton?.addEventListener('click', () => {
    // Don't show popup progress - the content script shows a nice center overlay
    sendMessageToContentScript({ action: 'analyzeAndPrepare' });
    // Close popup so user can see the center overlay
    window.close();
  });


  // Branch actions
  openBranchButton?.addEventListener('click', () => {
    const selectedBranch = branchSelector?.value;
    if (selectedBranch) {
      sendMessageToContentScript({ 
        action: 'openBranchInNewChat', 
        branchName: selectedBranch 
      });
      // Close popup so user can see the progress overlay during copy operation
      window.close();
    }
  });

  goToBranchButton?.addEventListener('click', () => {
    const selectedBranch = branchSelector?.value;
    if (selectedBranch) {
      sendMessageToContentScript({ 
        action: 'goToBranch', 
        branchName: selectedBranch 
      });
      // Close popup so user can see the progress overlay (if search is needed)
      window.close();
    }
  });

  // Copy buttons
  copyJsonButton?.addEventListener('click', () => {
    if (currentAnalysisData?.jsonData) {
      // Briefly disable buttons during export operation
      disableAllButtons();
      exportToFile(currentAnalysisData.jsonData, 'JSON', 'json');
      // Re-enable buttons after a short delay
      setTimeout(() => {
        enableAllButtons();
      }, 200);
    }
  });

  copyMermaidButton?.addEventListener('click', () => {
    if (currentAnalysisData?.mermaidData) {
      // Briefly disable buttons during export operation
      disableAllButtons();
      exportToFile(currentAnalysisData.mermaidData, 'Mermaid', 'mmd');
      // Re-enable buttons after a short delay
      setTimeout(() => {
        enableAllButtons();
      }, 200);
    }
  });

  // Helper function to create mermaid.live URL with proper pako compression
  async function createMermaidLiveUrl(mermaidCode) {
    try {
      // Step 1: Create JSON payload
      const payload = {
        code: mermaidCode.trim(),
        mermaid: { theme: 'default' }
      };
      
      // Step 2: Convert to JSON string and UTF-8 encode
      const jsonString = JSON.stringify(payload);
      const utf8Bytes = new TextEncoder().encode(jsonString);
      
      // Step 3: Compress using browser's compression API (if available)
      let compressed;
      if ('CompressionStream' in window) {
        console.log('SG: Using browser compression API');
        const stream = new CompressionStream('deflate');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(utf8Bytes);
        writer.close();
        
        const chunks = [];
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
      } else {
        console.log('SG: Browser compression not available, using fallback');
        // Fallback: just use the raw bytes (not ideal, but will work for small diagrams)
        compressed = utf8Bytes;
      }
      
      // Step 4: Base64-URL encode the compressed data
      const base64 = btoa(String.fromCharCode(...compressed));
      const urlSafeBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      // Step 5: Construct the Mermaid Live URL
      const mermaidUrl = `https://mermaid.live/edit#pako:${urlSafeBase64}`;
      console.log('SG: Generated pako URL with length:', mermaidUrl.length);
      
      return mermaidUrl;
      
    } catch (err) {
      console.error('SG: Failed to create pako URL:', err);
      // Final fallback: export file and open mermaid.live for manual import
      exportToFile(mermaidCode, 'Mermaid-fallback', 'mmd');
      console.log('SG: Exported Mermaid to file as fallback');
      return 'https://mermaid.live/edit';
    }
  }

  showGraphButton?.addEventListener('click', async () => {
    if (currentAnalysisData?.mermaidData) {
      console.log('SG: Mermaid data available:', !!currentAnalysisData.mermaidData);
      console.log('SG: Mermaid preview:', currentAnalysisData.mermaidData.substring(0, 100) + '...');
      
      // Disable buttons during graph processing
      disableAllButtons();
      
      try {
        const mermaidUrl = await createMermaidLiveUrl(currentAnalysisData.mermaidData);
        console.log('SG: Opening mermaid.live with URL:', mermaidUrl.substring(0, 100) + '...');
        chrome.tabs.create({ url: mermaidUrl });
      } catch (err) {
        console.error('SG: Error creating mermaid URL:', err);
        // Fallback: export to file and open mermaid.live
        exportToFile(currentAnalysisData.mermaidData, 'Mermaid-error-fallback', 'mmd');
        chrome.tabs.create({ url: 'https://mermaid.live/edit' });
      } finally {
        // Re-enable buttons after operation completes
        setTimeout(() => {
          enableAllButtons();
        }, 500);
      }
    } else {
      console.log('SG: No Mermaid data available');
    }
  });

  // --- Message Listeners ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analysisCompleted') {
      // Analysis was completed, reload data
      setTimeout(() => loadAnalysisData(), 500);
    }
  });

  // --- Initialization ---
  
  // Get active tab and check if it's a valid chat page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    activeTabId = tabs[0].id;
    
    // Check if we're on a valid chat page
    sendMessageToContentScript({ action: 'getCurrentChatInfo' }, (response) => {
      if (response && !response.isNewChat && response.chatId) {
        console.log('Valid chat page detected, chatId:', response.chatId);
        console.log('Analysis turn found:', response.analysisTurnFound, 'Has analysis:', response.hasAnalysis, 'Stored turn:', response.storedTurnId);
        
        currentChatInfo = response; // Store chat info for later use
        
        // UC-03, UC-04, UC-05, UC-06: Show main view for valid chat pages
        mainView.classList.remove('hidden');
        incorrectDomainView.classList.add('hidden');
        
        // UC-13: Check for page refresh before initializing popup
        checkForPageRefresh(response.chatId, (refreshDetected) => {
          if (refreshDetected) {
            // Show refresh detection modal
            showRefreshDetectionModal(response.chatId);
          } else {
            // Continue with normal initialization
            proceedWithNormalInitialization();
          }
        });
        
        function proceedWithNormalInitialization() {
          // UF-06: Check for active operations before initializing popup
          checkForActiveOperation((hasActiveOperation) => {
            if (hasActiveOperation) {
              // UC-11: Active operation detected - disable all buttons and show status message
              console.log('Active operation detected - disabling popup functionality');
              disableAllButtons();
              showOperationInProgressMessage();
              // Still load analysis data for UI structure, but keep buttons disabled
              loadAnalysisData();
            } else {
              // UC-11/UC-12: No active operation - normal initialization
              console.log('No active operation - normal popup initialization');
              loadAnalysisData();
              enableAllButtons();
            }
          });
        }
      } else {
        console.log('Not a valid chat page or new chat');
        // UC-01, UC-02: Wrong domain or new chat - show error
        mainView.classList.add('hidden');
        incorrectDomainView.classList.remove('hidden');
      }
    });
  });
});
