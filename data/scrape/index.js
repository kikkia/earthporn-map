const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;

puppeteer.use(StealthPlugin());

let lastAfter = ""
let lowest = 100000000;
// Gets top 1000 posts

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeReddit(url, results = []) {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url);

    const jsonString = await page.evaluate(() => {
      return document.body.innerText;
    });

    //console.log("Raw JSON:", jsonString); // Log the raw JSON string
    const content = JSON.parse(jsonString);

    await browser.close();

    const posts = content.data.children.filter(post => {
      const data = post.data;
      if (data.post_hint === 'image' || data.domain.includes('imgur') || data.domain.includes('flickr')) {
        return true;
      }
      return false;
    }).map(post => {
      const data = post.data;
      if (data.ups < lowest) {
        lowest = data.ups
      }

      return {
        title: data.title,
        ups: data.ups,
        num_comments: data.num_comments,
        created_utc: data.created_utc,
        id: data.id,
        author: data.author
      };
    });

    results.push(...posts);
    console.log(content.data.after)

    if (content.data.after) {
      await fs.writeFile('reddit_earthporn_year.json', JSON.stringify(results, null, 2));
      const nextUrl = `https://old.reddit.com/r/EarthPorn/top/.json?sort=top&t=all&after=${content.data.after}`;
      console.log("Sleeping for 10 seconds...");
      await sleep(15000); // 10 seconds sleep
      return scrapeReddit(nextUrl, results);
    } else {
      return results;
    }
  } catch (error) {
    console.error('Error scraping Reddit:', error);
    return results; // Return the results collected so far, even if there was an error.
  }
}

async function main() {
  //const initialUrl = 'https://old.reddit.com/r/EarthPorn/top/.json?sort=top&t=all&after=t3_aatu5j';
  const initialUrl = 'https://old.reddit.com/r/EarthPorn/top/.json?sort=top&t=year&after=t3_9o2jrh';
  try {
    const scrapedData = await scrapeReddit(initialUrl);
    await fs.writeFile('reddit_earthporn_year.json', JSON.stringify(scrapedData, null, 2));
    console.log('Scraping complete. Data saved to reddit_earthporn.json');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();