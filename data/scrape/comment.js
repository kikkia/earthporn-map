const fs = require('fs').promises;
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Grab comments for clues to locations
async function main() {
  try {
    // Read the input JSON file
    const postsData = JSON.parse(await fs.readFile('reddit_posts.json', 'utf8'));
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1280, height: 800 }
    });

    // Process each post
    for (const post of postsData) {
      console.log(`Processing post: ${post.id} - ${post.title.substring(0, 50)}...`);
      
      // Visit the post's comments page
      const url = `https://old.reddit.com/r/EarthPorn/comments/${post.id}?limit=500`;
      const page = await browser.newPage();
      
      // Set longer timeout and handle navigation errors
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      }).catch(err => {
        console.error(`Failed to load ${url}: ${err.message}`);
        return;
      });
      
      // Wait for the comments to load
      await page.waitForSelector('.commentarea', { timeout: 30000 }).catch(() => {
        console.log('Comment area not found or timed out');
      });
      
      // Extract the comments
      const comments = await extractComments(page, post.author);
      
      // Add the comments to the post object
      post.comments = comments;
      
      // Close the page to free up resources
      await page.close();
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 10000));
      await fs.writeFile('reddit_posts_with_comments.json', JSON.stringify(postsData, null, 2));
    }
    
    // Close the browser
    await browser.close();
    
    // Write the updated data back to a file
    await fs.writeFile('reddit_posts_with_comments.json', JSON.stringify(postsData, null, 2));
    console.log('All posts processed and saved to reddit_posts_with_comments.json');
    
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

async function extractComments(page, postAuthor) {
  return await page.evaluate((postAuthor) => {
    // Helper function to recursively extract comments and their replies
    function parseCommentTree(element) {
      const comments = [];
      
      // Get all top-level comments in this container
      const commentThings = element.querySelectorAll(':scope > .thing.comment');
      
      for (const commentThing of commentThings) {
        
        // Get the comment author
        const authorElement = commentThing.querySelector('.author');
        const author = authorElement ? authorElement.textContent.trim() : '[deleted]';
        
        // Check if the author is OP
        const isOP = author === postAuthor;
        
        // Get the comment text
        const contentElement = commentThing.querySelector('.md');
        const content = contentElement ? contentElement.textContent.trim() : '';
        
        // Find the child comments container
        const childContainer = commentThing.querySelector('.child > .sitetable');
        
        // Recursively parse replies if they exist
        const replies = childContainer ? parseCommentTree(childContainer) : [];
        
        // Create the comment object
        const comment = {
          author,
          isOP,
          content,
          replies
        };
        
        comments.push(comment);
      }
      
      return comments;
    }
    
    // Start with the top-level comments container
    const commentArea = document.querySelector('.commentarea');
    if (!commentArea) return [];
    
    const siteTable = commentArea.querySelector('.sitetable');
    if (!siteTable) return [];
    
    return parseCommentTree(siteTable);
  }, postAuthor);
}

main().catch(console.error);