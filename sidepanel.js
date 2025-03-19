document.getElementById("fetch").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "getTitle" });
});


chrome.runtime.onMessage.addListener((message) => {
    if (message.question && message.code) {
        document.getElementById("question").innerHTML = 
            `<pre>${htmlToText(message.question)}</pre>`
        document.getElementById("code").innerHTML =
            `<h3>Code:</h3>
             <pre>${message.code}</pre>`;
    }
});

document.getElementById("analyze").addEventListener("click", () => {
    const question = document.getElementById("question").innerText;
    const code = document.getElementById("code").innerText; // Assume code is entered in a textarea

    chrome.runtime.sendMessage({ action: "analyzeCode", question, code }, (response) => {
        document.getElementById("ai-analysis").innerText = response.aiResponse;
    });
});

// Handle button click for downloading
document.getElementById("download-txt").addEventListener("click", () => {
    const question = document.getElementById("question").innerText || "Unknown Question";  
    const code = document.getElementById("code").innerText;  // Replace with actual extracted code
    const explanation = document.getElementById("ai-analysis").innerText;  // Replace with AI output

    downloadAsTxt(question, code, explanation);
});


const htmlToText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // Replace `<p>` and `<br>` with newlines
    doc.body.innerHTML = doc.body.innerHTML.replace(/<p>/g, "\n").replace(/<br>/g, "");

    // Convert lists properly
    doc.body.querySelectorAll("li").forEach(li => {
        li.innerHTML = `• ${li.innerHTML}`;
    });

    return doc.body.innerText.trim(); // Extracts only text
};

// Function to extract title from question data
function extractTitle(questionText) {
    const firstLine = questionText.split("\n")[0];  // Extract the first line
    return firstLine.replace(/[^a-zA-Z0-9\s]/g, "").trim();  // Remove special characters
}

// Function to download as TXT with the title as the filename
function downloadAsTxt(question, code, explanation) {
    const title = extractTitle(question) || "leetcode_solution"; // Default if title is missing
    const content = `Question:\n${question}\n\nCode:\n${code}\n\nExplanation:\n${explanation}`;
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.txt`;  // Use extracted title as filename
    link.click();
    URL.revokeObjectURL(link.href);
}