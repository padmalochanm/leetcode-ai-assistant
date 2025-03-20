const LEETCODE_ORIGIN = "https://leetcode.com";

const getLeetCodeSession = async () => {
    return new Promise((resolve, reject) => {
        chrome.cookies.get({ url: "https://leetcode.com", name: "LEETCODE_SESSION" }, (cookie) => {
            if (cookie) {
                console.log("✅ LeetCode Session Found:", cookie.value);
                resolve(cookie.value);
            } else {
                console.error("❌ No LeetCode Session Found");
                reject(null);
            }
        });
    });
};

// Function to enable the side panel for all LeetCode tabs
async function enableSidePanelForLeetCode() {
    chrome.tabs.query({}, async (tabs) => {
        for (const tab of tabs) {
            if (tab.url && new URL(tab.url).origin === LEETCODE_ORIGIN) {
                await chrome.sidePanel.setOptions({
                    tabId: tab.id,
                    path: "sidepanel.html",
                    enabled: true
                });
            }
        }
    });
}

// Function to fetch the LeetCode question details
const fetchLeetCodeQuestion = async (slug) => {
    try {
        const response = await fetch("https://leetcode.com/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `{
                    question(titleSlug: "${slug}") {
                        title
                        content
                        difficulty
                        topicTags {
                            name
                            slug
                        }
                    }
                }`
            })
        });

        const data = await response.json();
        if (!data.data?.question) return null;

        const { title, content, difficulty, topicTags } = data.data.question;

        // Convert topic tags into a readable format
        const tags = topicTags.map(tag => tag.name).join(", ");

        return `# ${title}\n\n**Difficulty:** ${difficulty}\n\n**Topics:** ${tags}\n\n${content}`;
    } catch (error) {
        console.error("❌ Error fetching question:", error);
        return null;
    }
};

const fetchLeetCodeSolution = async (slug) => {
    try {
        const session = await getLeetCodeSession();
        if (!session) throw new Error("No valid session found!");

        const response = await fetch(`https://leetcode.com/api/submissions/${slug}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Cookie": `LEETCODE_SESSION=${session}`
            },
            credentials: "include"
        });

        const data = await response.json();
        if (!data.submissions_dump || data.submissions_dump.length === 0) return "No submissions found.";

        // Extract last submission
        const lastSubmission = data.submissions_dump[0];
        return `\n### **Last Submission:**\n\`\`\`${lastSubmission.lang}\n${lastSubmission.code}\n\`\`\``;

    } catch (error) {
        console.error("❌ Error fetching submission:", error);
        return "Error fetching your submitted code.";
    }
};


// Ensure the side panel opens when the extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("SidePanel Error:", error));

// Enable the side panel when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    enableSidePanelForLeetCode();
});

// Enable the side panel for existing tabs on browser startup
chrome.runtime.onStartup.addListener(() => {
    enableSidePanelForLeetCode();
});

// Enable the side panel when a tab is updated (navigated to LeetCode)
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (tab.url && new URL(tab.url).origin === LEETCODE_ORIGIN) {
        await chrome.sidePanel.setOptions({
            tabId,
            path: "sidepanel.html",
            enabled: true
        });
    }
});

// Listener to receive messages from the popup/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "analyzeCode") {
        fetch("https://leetcode-ai-assistant.onrender.com/analyze-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: message.question,
                code: message.code
            })
        })
        .then(response => response.json())
        .then(data => sendResponse({ aiResponse: data.aiResponse }))
        .catch(error => {
            console.error("Error:", error);
            sendResponse({ aiResponse: "Error in AI response." });
        });

        return true;
    }
});

// Listener for messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getTitle") {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (tabs.length === 0) return; // No active tab found
            let url = tabs[0].url;

            // Extract the problem slug (preserving hyphens)
            let match = url.match(/leetcode\.com\/problems\/([^\/]*)\//);
            let problemSlug = match ? match[1] : null;

            if (problemSlug) {
                const question = await fetchLeetCodeQuestion(problemSlug);
                const code = await fetchLeetCodeSolution(problemSlug);

                // Send data back to the side panel
                chrome.runtime.sendMessage({ problemSlug, question, code });
            } else {
                chrome.runtime.sendMessage({ error: "❌ No LeetCode problem detected." });
            }
        });
    }
});
