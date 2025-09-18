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


  function copyToClipboard(text, type) {
    navigator.clipboard.writeText(text).then(() => {
      console.log(`${type} copied to clipboard`);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
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
    }
  });

  goToBranchButton?.addEventListener('click', () => {
    const selectedBranch = branchSelector?.value;
    if (selectedBranch) {
      sendMessageToContentScript({ 
        action: 'goToBranch', 
        branchName: selectedBranch 
      });
    }
  });

  // Copy buttons
  copyJsonButton?.addEventListener('click', () => {
    if (currentAnalysisData?.jsonData) {
      copyToClipboard(currentAnalysisData.jsonData, 'JSON');
    }
  });

  copyMermaidButton?.addEventListener('click', () => {
    if (currentAnalysisData?.mermaidData) {
      copyToClipboard(currentAnalysisData.mermaidData, 'Mermaid');
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
      // Final fallback: just open mermaid.live and copy the code to clipboard
      copyToClipboard(mermaidCode, 'Mermaid (fallback)');
      console.log('SG: Copied Mermaid to clipboard as fallback');
      return 'https://mermaid.live/edit';
    }
  }

  showGraphButton?.addEventListener('click', async () => {
    if (currentAnalysisData?.mermaidData) {
      console.log('SG: Mermaid data available:', !!currentAnalysisData.mermaidData);
      console.log('SG: Mermaid preview:', currentAnalysisData.mermaidData.substring(0, 100) + '...');
      
      try {
        const mermaidUrl = await createMermaidLiveUrl(currentAnalysisData.mermaidData);
        console.log('SG: Opening mermaid.live with URL:', mermaidUrl.substring(0, 100) + '...');
        chrome.tabs.create({ url: mermaidUrl });
      } catch (err) {
        console.error('SG: Error creating mermaid URL:', err);
        // Fallback: copy to clipboard and open mermaid.live
        copyToClipboard(currentAnalysisData.mermaidData, 'Mermaid (error fallback)');
        chrome.tabs.create({ url: 'https://mermaid.live/edit' });
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
        
        // Load analysis data from DOM and apply proper UI state based on use cases
        loadAnalysisData();
      } else {
        console.log('Not a valid chat page or new chat');
        // UC-01, UC-02: Wrong domain or new chat - show error
        mainView.classList.add('hidden');
        incorrectDomainView.classList.remove('hidden');
      }
    });
  });
});
