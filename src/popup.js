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
    
    // Get branch names with counts from the branch map
    const branchCounts = {};
    Object.values(analysisData.branchMap).forEach(data => {
      if (data && data.thread) {
        branchCounts[data.thread] = (branchCounts[data.thread] || 0) + 1;
      }
    });
    
    // Sort and add to selector with message counts
    Object.keys(branchCounts).sort().forEach(branchName => {
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
        console.log('Analysis data found in DOM');
        currentAnalysisData = {
          jsonData: response.jsonData,
          mermaidData: response.mermaidData,
          branchMap: response.branchMap
        };
        
        // Show analysis sections
        if (Object.keys(response.branchMap).length > 0) {
          filteringView.classList.remove('hidden');
          populateBranchSelector(currentAnalysisData);
        }
        
        if (response.jsonData || response.mermaidData) {
          mermaidSection.classList.remove('hidden');
        }
        
        // Keep analyze button visible - users might want to run new analysis
      } else {
        console.log('No analysis data found in DOM');
        
        // Check if we have stored analysis that's not visible
        if (currentChatInfo && currentChatInfo.storedTurnId && !currentChatInfo.analysisTurnFound) {
          showAnalysisNotFoundOptions();
        } else {
          // No analysis found and no stored reference - hide analysis features
          filteringView.classList.add('hidden');
          mermaidSection.classList.add('hidden');
        }
      }
    });
  }

  function showAnalysisNotFoundOptions() {
    // Create a temporary message with options
    const messageDiv = document.createElement('div');
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
        📊 Analysis exists but not visible in current view
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
        <button id="searchAnalysisBtn" style="
          background-color: #2ecc71; 
          color: white; 
          border: none; 
          padding: 8px; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 0.8em;
        ">🔍 Find Analysis</button>
        <button id="newAnalysisBtn" style="
          background-color: #3498db; 
          color: white; 
          border: none; 
          padding: 8px; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 0.8em;
        ">📝 New Analysis</button>
      </div>
    `;
    
    // Insert before the analyze button
    analyzeButton.parentNode.insertBefore(messageDiv, analyzeButton);
    
    // Add event listeners
    messageDiv.querySelector('#searchAnalysisBtn').addEventListener('click', () => {
      sendMessageToContentScript({ action: 'scrollToAnalysis' }, (response) => {
        if (response && response.status === 'found') {
          window.close(); // Close popup after successful navigation
        } else {
          alert('Could not find the analysis. It may have been deleted.');
          messageDiv.remove();
        }
      });
    });
    
    messageDiv.querySelector('#newAnalysisBtn').addEventListener('click', () => {
      messageDiv.remove();
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
        console.log('Analysis turn found:', response.analysisTurnFound, 'Stored turn:', response.storedTurnId);
        
        currentChatInfo = response; // Store chat info for later use
        
        mainView.classList.remove('hidden');
        incorrectDomainView.classList.add('hidden');
        
        // Load analysis data from DOM
        loadAnalysisData();
      } else {
        console.log('Not a valid chat page or new chat');
        mainView.classList.add('hidden');
        incorrectDomainView.classList.remove('hidden');
      }
    });
  });
});
