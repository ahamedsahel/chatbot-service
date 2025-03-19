const db = require('../db');
const { Configuration, OpenAIApi } = require('openai');

// Initialize OpenAI
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
async function generateSQLQuery(messages, callback) {
  const userQuery = messages[messages.length - 1].content;

  const prompt = `
  Convert the following user question into a secure SQL query:
  "${userQuery}"
  
  Database Schema:
  - Table: tudo (id, name, age, place, description, date)
  - Ensure to use parameterized queries.

  Step 1: Determine whether the query is a **fetch request (SELECT)** or **insert request (INSERT)**.
  Step 2: If it's a **fetch request**, generate the correct **SELECT** query based on the available attributes.
  Step 3: If it's an **insert request**, check for missing fields.
  Step 4: If any required field is missing, return a message asking the user to provide them.
  
  **Example Outputs:**

  **For Fetch Request (SELECT)**
  User: "What is John's age?"
  Output:
  { "query": "SELECT age FROM tudo WHERE name = ?", "params": ["John"] }

  User: "Give me details of Hashim."
  Output:
  { "query": "SELECT * FROM tudo WHERE name = ?", "params": ["Hashim"] }

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

    console.log("OpenAI Response:", openAIResponse.data.choices[0].message.content);
    const response = JSON.parse(openAIResponse.data.choices[0].message.content);

    if (response.missingFields) {
      return callback(null, null, response.message);
    } else {
      return callback(response.query, response.params, null);
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
      generateSQLQuery(messages, (sqlQuery, params, missingMessage) => {
        if (missingMessage) {
          return res.json({ botReply: { role: "assistant", content: missingMessage } });
        }

        if (sqlQuery) {
          executeQuery(sqlQuery, params, async (result) => {
            if (result.length > 0) {
              // For SELECT Query
              const key = Object.keys(result[0])[0]; // Get column name
              const value = result[0][key];         // Get column value
              const data = `${name}'s ${key} is ${value}.`;

              // Rephrase response using OpenAI
              const openAIResponse = await openai.createChatCompletion({
                model: "gpt-4",
                messages: [
                  { role: "system", content: "You are a helpful assistant." },
                  { role: "user", content: `Rephrase this: ${data}` }
                ]
              });

              const botReply = openAIResponse.data.choices[0].message.content;
              return res.json({ botReply: { role: "assistant", content: botReply } });
            } else {
              return res.json({ botReply: { role: "assistant", content: "Data successfully added or no results found." } });
            }
          });
        } else {
          return res.json({ botReply: { role: "assistant", content: "Invalid request." } });
        }
      });
    } else {
      return res.json({ botReply: { role: "assistant", content: "I couldn't find that name in the database. Please try again." } });
    }
  });
}

module.exports = {
  handleChatbotRequest
};
