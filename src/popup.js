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
    
    // Get unique branch names from the branch map
    const branchNames = new Set();
    Object.values(analysisData.branchMap).forEach(data => {
      if (data.thread) {
        branchNames.add(data.thread);
      }
    });
    
    // Sort and add to selector
    Array.from(branchNames).sort().forEach(branchName => {
      const option = document.createElement('option');
      option.value = branchName;
      option.textContent = branchName;
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

  showGraphButton?.addEventListener('click', () => {
    if (currentAnalysisData?.mermaidData) {
      const mermaidUrl = `https://mermaid.live/edit#pako:${btoa(currentAnalysisData.mermaidData)}`;
      chrome.tabs.create({ url: mermaidUrl });
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
