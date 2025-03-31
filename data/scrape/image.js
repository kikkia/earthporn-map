const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Download images for making thumbnails
async function downloadImage(url, filepath) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
      });
  
      if (response.status === 200) {
        const writer = fsSync.createWriteStream(filepath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      } else {
        console.error(`Failed to download image from ${url}: Status ${response.status}`);
      }
    } catch (error) {
      console.error(`Error downloading image from ${url}: ${error.message}`);
    }
  }

async function main() {
  try {
    const postsData = JSON.parse(await fs.readFile('reddit_posts.json', 'utf8'));
    const downloadDir = 'images';
    await fs.mkdir(downloadDir, { recursive: true });
    
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1280, height: 800 }
    });

    for (const post of postsData) {
      const existingFiles = await fs.readdir("images/");
      const alreadyExists = existingFiles.some(file => file.startsWith(`${post.id}.`));
      if (alreadyExists) {
        continue
      }
      console.log(`Processing post: ${post.id} - ${post.title.substring(0, 50)}...`);
      
      const url = `https://old.reddit.com/r/EarthPorn/comments/${post.id}`;
      const page = await browser.newPage();
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      }).catch(err => {
        console.error(`Failed to load ${url}: ${err.message}`);
        return;
      });
      
      try {
        // Try to find the main image directly (often in a link or an embedded image)
        let imageUrl = await page.evaluate(() => {
          const mediaViewer = document.querySelector('.media-viewer-image');
          if (mediaViewer && mediaViewer.src) {
            return mediaViewer.src;
          }

          const link = document.querySelector('.top-matter a.title');
          if (link && (link.href.includes('i.redd.it') || link.href.includes('imgur.com'))) {
            return link.href;
          }

          const embeddedImage = document.querySelector('.entry .expando-button + div.md img');
          if (embeddedImage && embeddedImage.src) {
            return embeddedImage.src;
          }

          // Fallback to thumbnail if no direct image is found
          const thumbnailLink = document.querySelector('a.thumbnail');
          if (thumbnailLink && thumbnailLink.href.includes('i.redd.it') || (thumbnailLink && thumbnailLink.href.includes('imgur.com'))) {
            return thumbnailLink.href;
          }

          return null;
        });

        if (imageUrl) {
          console.log(`Found image URL: ${imageUrl}`);
          const parsedUrl = new URL(imageUrl);
          const pathname = parsedUrl.pathname;
          const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
          const format = filename.substring(filename.lastIndexOf('.') + 1);
          const savePath = path.join('.', `images/${post.id}.${format}`);

          await downloadImage(imageUrl, savePath);
          console.log(`Saved image as ${savePath}`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          console.warn(`No suitable image found for post ${post.id}`);
        }
      } catch (error) {
        console.error(`Error processing image for post ${post.id}: ${error}`);
      } finally {
        await page.close();
      }
    }
    
    await browser.close();

  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main().catch(console.error);