# Privacy Policy for Google AI Studio Chat Threads

**Effective Date:** September 18, 2025

Thank you for using Google AI Studio Chat Threads. Your privacy is our top priority. This policy explains what data our extension interacts with and how it is handled.

### The Golden Rule: Your Data is Yours

**TL;DR:** This extension operates entirely on your local computer. We do not collect, store (on our servers), transmit, or sell any of your personal data or chat history. Period.

### 1. What Data We Access

When you activate the extension on a Google AI Studio chat page, it needs to read the content of that page to function. This includes:
*   The text of your prompts and the AI's responses.
*   The structure of the page (DOM elements) to identify individual messages.

This access is temporary, read-only, and only happens when you explicitly click a button in the extension's popup.

### 2. How We Use Your Data

The data accessed is used exclusively for the following local functions:
*   **To Generate the Diagram:** The chat history is processed in your browser to create the Mermaid visualization graph.
*   **To Copy Branches:** The content of a selected conversational thread is gathered and copied to your clipboard so you can paste it into a new chat.
*   **To Navigate Branches:** To scroll your view to the specific message that starts a branch.

### 3. Data Storage

The extension uses `chrome.storage.local` to store one piece of non-personal, non-content information for each chat you analyze:
*   The unique ID of the AI's last analysis response (e.g., `turn-12345`).

This is stored **only on your local computer** to help the extension quickly find the existing analysis when you reopen it. We do **not** store the content of your chats.

### 4. Data Transmission

**We do not transmit any of your chat data to our servers or any third-party servers.** All processing happens locally in your browser.

The only interaction with an external service is when you click the "Show Graph" button. This feature constructs a URL to the public `mermaid.live` website. The diagram data is encoded within this URL. The extension does not automatically send any data to this service; it simply opens a link in a new tab based on your action.

### 5. Changes to This Policy

We may update this privacy policy in the future. Any changes will be reflected in the extension's description and in this file.

### 6. Contact Us

If you have any questions or concerns about this privacy policy, please open an issue on our [GitHub repository](https://github.com/agentic-ai-humans/google-ai-studio-chat-branches/issues).
