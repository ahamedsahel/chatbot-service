const db = require('../db');
const { Configuration, OpenAIApi } = require('openai');
const express = require('express');
const router = express.Router();

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set.");
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Extracts Name from Messages
function extractName(messages, names) {
  const userMessage = messages[messages.length - 1].content.toLowerCase();
  return names.find(name => userMessage.includes(name.toLowerCase())) || null;
}

// Get All Names from DB
function getAllNames(callback) {
  db.query("SELECT DISTINCT name FROM tudo", (err, results) => {
    if (err) {
      console.error("Error fetching names:", err);
      callback([]);
    } else {
      const names = results.map(row => row.name);
      callback(names);
    }
  });
}

// Generate SQL Query using OpenAI
async function generateSQLQuery(messages, names, callback) {
  const userQuery = messages[messages.length - 1].content;

  const prompt = `
  Convert the following user question into secure SQL queries for each name:
  "${userQuery}"
  
  Database Schema:
  - Table: tudo (id, name, age, place, description, date)
  - Ensure to use parameterized queries.

  Step 1: Determine whether the query is a **fetch request (SELECT)** or **insert request (INSERT)**.
  Step 2: If it's a **fetch request**, generate the correct **SELECT** query based on the available attributes for each name.
  Step 3: If it's an **insert request**, check for missing fields.
  Step 4: If any required field is missing, return a message asking the user to provide them.
  
  **Example Outputs:**

  **For Fetch Request (SELECT)**
  User: "What are the ages of John and Jane?"
  Output:
  [
    { "query": "SELECT age FROM tudo WHERE name = ?", "params": ["John"] },
    { "query": "SELECT age FROM tudo WHERE name = ?", "params": ["Jane"] }
  ]

  **For Insert Request (INSERT)**
  User: "Add John with age 25 and date 2024-02-26."
  Output (If fields are missing):
  { "missingFields": ["place", "description"], "message": "Please provide the place and description to add this record." }

  Output (If all fields are present):
  { "query": "INSERT INTO tudo (id, name, age, place, description, date) VALUES (?, ?, ?, ?, ?, ?)", "params": [1, "John", 25, "New York", "Software Engineer", "2024-02-26"] }
`;

  try {
    const openAIResponse = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    });

    const responseText = openAIResponse.data.choices[0].message.content;
    console.log("OpenAI Response:", responseText);

    // Extract JSON from response text
    const jsonStartIndex = responseText.indexOf('[');
    const jsonEndIndex = responseText.lastIndexOf(']') + 1;
    const jsonResponse = responseText.substring(jsonStartIndex, jsonEndIndex);

    const response = JSON.parse(jsonResponse);

    if (response.some(r => r.missingFields)) {
      const missingMessage = response.find(r => r.missingFields).message;
      return callback(null, null, missingMessage);
    } else {
      return callback(response, null);
    }
  } catch (error) {
    console.error("Error generating SQL:", error);
    callback(null, null, "An error occurred while processing your request.");
  }
}

// Execute SQL Query
function executeQuery(query, params, callback) {
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Database Query Error:", err);
      callback([]);
    } else {
      callback(results);
    }
  });
}

// Define a route to check if the API is working
router.get("/", (req, res) => {
  res.json({ message: "Chatbot API is working!" });
});

// API Route to Handle OpenAI Chatbot Request
async function handleChatbotRequest(req, res) {
  console.log("Received request body:", req.body);
  const { messages } = req.body;
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  getAllNames((names) => {
    const name = extractName(messages, names);

    if (name) {
      generateSQLQuery(messages, names, (sqlQueries, params, missingMessage) => {
        if (missingMessage) {
          return res.json({ botReply: { role: "assistant", content: missingMessage } });
        }

        if (sqlQueries) {
          const results = [];
          sqlQueries.forEach((queryObj, index) => {
            executeQuery(queryObj.query, queryObj.params, async (result) => {
              if (result.length > 0) {
                // For SELECT Query
                const key = Object.keys(result[0])[0]; // Get column name
                const value = result[0][key];         // Get column value
                const data = `${queryObj.params[0]}'s ${key} is ${value}.`;

                // Rephrase response using OpenAI
                const openAIResponse = await openai.createChatCompletion({
                  model: "gpt-4",
                  messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: `Rephrase this: ${data}` }
                  ]
                });

                const botReply = openAIResponse.data.choices[0].message.content;
                console.log("OpenAI Response:", botReply);
                results.push(botReply);

                if (results.length === sqlQueries.length) {
                  return res.json({ botReply: { role: "assistant", content: results.join(' ') } });
                }
              } else {
                results.push("Data successfully added or no results found.");
                if (results.length === sqlQueries.length) {
                  return res.json({ botReply: { role: "assistant", content: results.join(' ') } });
                }
              }
            });
          });
        } else {
          return res.json({ botReply: { role: "assistant", content: "Invalid request." } });
        }
      });
    } else {
      // Handle non-database-related prompts using OpenAI
      const userMessage = messages[messages.length - 1].content;
      openai.createChatCompletion({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userMessage }
        ]
      }).then(openAIResponse => {
        const botReply = openAIResponse.data.choices[0].message.content;
        return res.json({ botReply: { role: "assistant", content: botReply } });
      }).catch(error => {
        console.error("Error generating response:", error);
        return res.json({ botReply: { role: "assistant", content: "An error occurred while processing your request." } });
      });
    }
  });
}

module.exports = {
  handleChatbotRequest,
  router
};
