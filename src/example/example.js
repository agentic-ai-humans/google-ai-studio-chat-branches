
// content_script.js
console.log("CS: Google AI Studio Chat Threads - Content script loaded.");

let pageConfig = { turnSelector: null };

function determinePageConfiguration() {
  const url = window.location.href;
  pageConfig.turnSelector = url.includes("/prompts/") ? 'ms-chat-turn' : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'analyzeAndPrepare':
      analyzeAndPrepare();
      sendResponse({ status: 'ok' });
      break;
    case 'openThreadInNewChat':
      openFilteredThread(request.threadName);
      sendResponse({ status: 'ok' });
      break;
  }
  return true;
});

// --- FUNKCJA CZEKAJĄCA NA TREŚĆ W KONKRETNEJ WIADOMOŚCI ---
function waitForContentInTurn(turnElement, timeout = 3000) {
    return new Promise((resolve) => {
        if (!turnElement) { resolve(null); return; }
        const interval = 100;
        let elapsedTime = 0;
        const checker = setInterval(() => {
            const contentNode = turnElement.querySelector('ms-cmark-node');
            if (contentNode && contentNode.innerText.trim() !== "") {
                clearInterval(checker);
                // Zwracamy znaleziony content
                resolve({
                    richContent: contentNode.innerHTML.trim(),
                    textContent: contentNode.innerText.trim()
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

// --- OSTATECZNA WERSJA: WSPINACZKA I ZBIERANIE DANYCH JEDNOCZEŚNIE ---
async function climbAndScrapeHistory() {
    console.log("CS: Starting FINAL climb & scrape process...");
    determinePageConfiguration();
    if (!pageConfig.turnSelector) { return []; }

    const allTurns = Array.from(document.querySelectorAll(pageConfig.turnSelector));
    if (allTurns.length === 0) { return []; }

    const scrapedHistory = [];
    let currentTurn = allTurns[allTurns.length - 1];
    
    let safetyBreak = 500;
    while (currentTurn && safetyBreak-- > 0) {
        // Ustawiamy aktualny blok w widoku
        currentTurn.scrollIntoView({ block: 'center', behavior: 'smooth' });

        // Czekamy na treść i od razu ją pobieramy
        const content = await waitForContentInTurn(currentTurn);
        
        if (content) {
            const role = currentTurn.classList.contains('user') ? "User" : "Model";
            scrapedHistory.push({ role, ...content });
        }

        const previousTurn = currentTurn.previousElementSibling;
        if (!previousTurn || !previousTurn.matches(pageConfig.turnSelector)) {
            console.log("CS: Reached the absolute top turn. Scrape finished.");
            break;
        }
        currentTurn = previousTurn;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (safetyBreak <= 0) console.warn("CS: Scrape safety break triggered.");
    
    // Odwracamy zebraną historię, aby była w poprawnej kolejności
    return scrapedHistory.reverse();
}


async function analyzeAndPrepare() {
  console.log("CS: Analysis process started.");
  
  const scrapedHistory = await climbAndScrapeHistory();
  
  if (scrapedHistory.length === 0) {
    console.warn("CS: Scrape completed but found no content. Aborting.");
    alert("Could not find any content to analyze. Please ensure the chat is not empty.");
    return;
  }
  
  const chatHistoryForStorage = [];
  let historyForPrompt = "";

  scrapedHistory.forEach((message, index) => {
      chatHistoryForStorage.push({ id: index + 1, role: message.role, richContent: message.richContent });
      historyForPrompt += `MESSAGE ${index + 1} (${message.role}):\n${message.textContent}\n\n---\n\n`;
  });
  
  chrome.storage.local.set({ chat_history: chatHistoryForStorage });

  const dualPurposePrompt = `You are a conversation analysis AI...`; // Reszta promptu
  
  const finalPrompt = dualPurposePrompt.replace('[CHAT HISTORY TO ANALYZE]', `<details>...</details>`);
  
  insertPrompt(finalPrompt);
  
  setTimeout(watchForAnalysisResponse, 2000); 
}

// Pełny kod pozostałych funkcji
async function analyzeAndPrepare() {
  console.log("CS: Analysis process started.");
  
  const scrapedHistory = await climbAndScrapeHistory();
  
  if (scrapedHistory.length === 0) {
    console.warn("CS: Scrape completed but found no content. Aborting.");
    alert("Could not find any content to analyze. Please ensure the chat is not empty.");
    return;
  }
  
  const chatHistoryForStorage = [];
  let historyForPrompt = "";

  scrapedHistory.forEach((message, index) => {
      chatHistoryForStorage.push({ id: index + 1, role: message.role, richContent: message.richContent });
      historyForPrompt += `MESSAGE ${index + 1} (${message.role}):\n${message.textContent}\n\n---\n\n`;
  });
  
  chrome.storage.local.set({ chat_history: chatHistoryForStorage });

  const dualPurposePrompt = `You are a conversation analysis AI. Your task is to analyze the chat history and provide two outputs: a JSON map of threads and a Mermaid git graph for visualization.

[TASK]
1.  Read the entire chat history provided below inside the collapsible section.
2.  Assign each message ID to a thematic thread (e.g., "Extension Debugging", "GitHub Repo").
3.  First, provide a JSON object that maps each message ID to its thread name.
4.  Second, provide a Mermaid gitGraph visualizing these threads.

[OUTPUT FORMAT]
Your output MUST contain two distinct, valid code blocks in this exact order:
1.  A JSON code block.
2.  A Mermaid code block.

Do NOT add any other text or explanations.

[CHAT HISTORY TO ANALYZE]
<details>
  <summary>Click to view the full Chat History provided for analysis</summary>
  <div style="border: 1px solid #ccc; padding: 10px; margin-top: 5px; background-color: #f9f9f9; color: #333; font-family: monospace; white-space: pre-wrap;">
---
${historyForPrompt}---
  </div>
</details>

Produce the two code blocks now:`;
  
  insertPrompt(dualPurposePrompt);
  
  setTimeout(watchForAnalysisResponse, 2000); 
}

function watchForAnalysisResponse() {
  const lastModelTurn = Array.from(document.querySelectorAll(`${pageConfig.turnSelector}.model`)).pop();
  if (!lastModelTurn) return;

  const observer = new MutationObserver((mutations) => {
      const contentNode = lastModelTurn.querySelector('ms-cmark-node');
      const responseText = contentNode ? contentNode.innerText.trim() : '';

      const jsonMatch = responseText.match(/```json\s*([\s\S]+?)\s*```/);
      if (jsonMatch) {
        try {
          const jsonString = jsonMatch[1];
          const threadMap = JSON.parse(jsonString);
          chrome.storage.local.set({ thread_map: threadMap });
          console.log("CS: Thread map saved to storage.");
          observer.disconnect();
        } catch (error) {
          console.error("CS: Failed to parse JSON from AI response.", error);
        }
      }
  });

  observer.observe(lastModelTurn, { childList: true, subtree: true });
}

async function openFilteredThread(threadName) {
  const data = await chrome.storage.local.get(['chat_history', 'thread_map']);
  if (!data.chat_history || !data.thread_map) return;
  
  let filteredContent = "";
  // Teraz `chat_history` zawiera już poprawne, ponumerowane wiadomości
  for (const message of data.chat_history) {
    if (data.thread_map[String(message.id)] === threadName) {
      filteredContent += `<h3>Message from ${message.role}:</h3>\n${message.richContent}\n\n<hr>\n\n`;
    }
  }

  const finalContentForNewChat = `Please continue the conversation based on the following context, which is a filtered thread from a previous chat. Preserve the code formatting and structure:\n\n${filteredContent}`;
  
  navigator.clipboard.writeText(finalContentForNewChat).then(() => {
    alert(`The full history for the "${threadName}" thread has been copied to your clipboard. Please paste it into a new chat.`);
  });
}

function insertPrompt(text) {
  const promptTextarea = document.querySelector('.prompt-input-wrapper textarea') || document.querySelector('ms-autosize-textarea textarea');
  if (promptTextarea) {
    promptTextarea.value = text;
    promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}