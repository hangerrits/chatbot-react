const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistant_id = process.env.OPENAI_ASSISTANT_ID;

let requestCount = 0;

// Load the URL-filename mapping
let urlFilenameMap = {};

async function loadUrlFilenameMap() {
  try {
    const data = await fs.readFile(path.join(__dirname, 'url_filename_table.json'), 'utf8');
    console.log('Raw JSON data:', data);
    const jsonData = JSON.parse(data);
    console.log('Parsed JSON data:', JSON.stringify(jsonData, null, 2));
    urlFilenameMap = jsonData.reduce((acc, item) => {
      acc[item.filename] = item.url;
      return acc;
    }, {});
    console.log('URL-filename mapping loaded successfully');
    console.log('urlFilenameMap:', urlFilenameMap);
  } catch (error) {
    console.error('Error loading URL-filename mapping:', error);
  }
}

loadUrlFilenameMap();

app.post('/api/chat', async (req, res) => {
  const requestId = ++requestCount;
  const { message } = req.body;
  console.log(`Request ${requestId} received - Message: ${message}`);

  try {
    const thread = await openai.beta.threads.create();
    console.log(`Request ${requestId} - Created thread: ${thread.id}`);

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    console.log(`Request ${requestId} - Added message to thread`);

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant_id,
    });
    console.log(`Request ${requestId} - Created run: ${run.id}`);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    let fullResponse = '';
    let citations = [];

      while (true) {
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        console.log(`Request ${requestId} - Run status: ${runStatus.status}`);

        if (runStatus.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(thread.id);
          const lastMessage = messages.data[0];
          if (lastMessage.role === 'assistant') {
            const textContent = lastMessage.content.find(c => c.type === 'text');
            if (textContent) {
              fullResponse = textContent.text.value;
              const annotations = textContent.text.annotations || [];
              
              // Process annotations
              for (let [index, annotation] of annotations.entries()) {
                if (annotation.type === 'file_citation') {
                  const citationIndex = index + 1;
                  fullResponse = fullResponse.replace(annotation.text, `[${citationIndex}]`);
                  
                  try {
                    const citedFile = await openai.files.retrieve(annotation.file_citation.file_id);
                    console.log(`Cited filename: ${citedFile.filename}`);
                    const mappedUrl = urlFilenameMap[citedFile.filename];
                    console.log(`Mapped URL for ${citedFile.filename}: ${mappedUrl}`);
                    citations.push({
                      index: citationIndex,
                      text: annotation.text,
                      originalUrl: annotation.text, // This should be the original URL
                      mappedUrl: mappedUrl || null,
                      filename: citedFile.filename
                    });
                  } catch (error) {
                    console.error(`Error retrieving file for citation ${citationIndex}:`, error);
                    citations.push({
                      index: citationIndex,
                      text: annotation.text,
                      originalUrl: annotation.text,
                      error: 'File information unavailable'
                    });
                  }
                }
              }

              console.log(`Request ${requestId} - Full response: ${fullResponse}`);
              console.log(`Request ${requestId} - Citations: ${JSON.stringify(citations)}`);
              res.write(`data: ${JSON.stringify({ fullResponse, citations })}\n\n`);
            }
          }
          break;
        } else if (runStatus.status === 'failed') {
          console.error(`Request ${requestId} - Run failed: ${runStatus.last_error}`);
          res.write(`data: ${JSON.stringify({ error: 'Run failed' })}\n\n`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    res.write('event: end\ndata: Stream ended\n\n');
    res.end();
    console.log(`Request ${requestId} - Response sent and stream ended`);

  } catch (error) {
    console.error(`Request ${requestId} - Error:`, error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
