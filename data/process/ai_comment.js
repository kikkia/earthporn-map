const fs = require('fs');
const path = require('path');
const axios = require('axios');

const INPUT_FILE = 'scrape/posts_with_comments.json';
const OUTPUT_FILE = 'output_comment.json';
const LM_STUDIO_API_URL = 'http://localhost:1234/v1/chat/completions';

// Uses a local running model on LM Studio to check if there are any obvious places mentioned in the comments about location.
function extractTextFromComments(comments, depth = 0, maxDepth = 3) {
  if (!comments || depth > maxDepth) return [];
  
  let textSnippets = [];
  
  for (const comment of comments) {
    const content = comment.content || '';
    
    const locationKeywords = ['location', 'place', 'where', 'taken', 'shot', 'park', 'mountain', 
                             'lake', 'trail', 'forest', 'beach', 'island', 'river', 'valley', 
                             'glacier', 'national', 'state', 'country', 'region', 'area', "this is", "called", "near", "mt."];
    
    const hasLocationKeywords = locationKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    if (hasLocationKeywords && content.length < 1000) {
      textSnippets.push(content);
    }
    
    if (comment.isOP) {
      textSnippets.push(content);
    }
    
    if (comment.replies && comment.replies.length > 0) {
      textSnippets = textSnippets.concat(
        extractTextFromComments(comment.replies, depth + 1, maxDepth)
      );
    }
  }
  
  return textSnippets;
}

async function getLocationFromPost(title, comments) {
  try {
    const commentSnippets = extractTextFromComments(comments);
    
    let promptContent = `Based on this photo title and comment information, what is the most specific geographical location being shown?\n\nTitle: "${title}"`;
    
    if (commentSnippets.length > 0) {
      promptContent += `\n\nRelevant comments:`;
      commentSnippets.forEach((snippet, i) => {
        if (i < 500) {
          promptContent += `\n\nComment ${i+1}: "${snippet.trim()}"`;
        }
      });
    }
    
    const response = await axios.post(
      LM_STUDIO_API_URL,
      {
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that can identify geographical locations from photo descriptions and discussions. Based on the post title and comments, help me figure out exactly where this photo was taken. Estimate the name of the place even if it is not just a town, like saying the name of a park, pass, rock, mountain, etc or geological feature. Please respond with only the estimated place name or "N/A" if you do not have enough info to make a good guess, Be descriptive, state and country name inclusions are good. (Good means specific, not just a continent or country name that is too vague). REPLY WITH ONLY THE LOCATION GUESS OR N/A'
          },
          {
            role: 'user',
            content: promptContent
          }
        ],
        model: 'local-model',
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error getting location for post: ${title}`, error.message);
    return 'Location could not be determined';
  }
}

async function processJsonFile() {
  console.log('Starting to process JSON file with comment data...');
  try {
    const jsonData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    
    console.log(`Processing ${jsonData.length} items...`);
    for (let i = 0; i < jsonData.length; i++) {
      const item = jsonData[i];
      console.log(`Processing item ${i + 1}/${jsonData.length}: ${item.title.substring(0, 50)}...`);
      
      item.location = await getLocationFromPost(item.title, item.comments || []);
      console.log(`Got location: ${item.location}`);
      item.comments = []
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
    }
    
    console.log(`Processing complete. Results saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error processing JSON file:', error);
  }
}

processJsonFile();