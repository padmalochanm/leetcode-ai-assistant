import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import fetch from "node-fetch"

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const TOGETHER_AI_KEY = process.env.TOGETHER_AI_KEY;

app.post("/analyze-code", async (req, res) => {
    const { question, code } = req.body;

    if (!TOGETHER_AI_KEY) {
        return res.status(500).json({ error: "API Key not set" });
    }

    const prompt = `
    Given the LeetCode problem:
    "${question}"
    
    And the following user-submitted solution:
    ${code}
    
    Analyze and provide:
    1. Time complexity
    2. Space complexity
    3. Explanation of logic
    4. Any possible optimizations
    `;

    try {
        const response = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${TOGETHER_AI_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
                messages: [{ role: "user", content: prompt }],
            }),
        });

        const data = await response.json();
        res.json({ aiResponse: data.choices?.[0]?.message?.content || "No response from AI." });
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Error in AI response." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));