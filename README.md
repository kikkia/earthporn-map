# [r/EarthPorn heatmap](https://earthporn.kikkia.dev)

![image](https://github.com/user-attachments/assets/2237ec3d-386c-4c8f-8bbd-0b3dd24293f4)

I was curious about the density and representation of posts on the r/Earthporn subreddit, so I decided to take some time and map this out. This map takes the top 1000 posts of all time on that subreddit and maps them as accuratly as I could do it without spending an insane amount of time doing it totally manually.

## Getting the data
I wanted to do more than 1000 posts but unfortunately reddit only shows the last 1000 posts for any given sort option (Top/All time). I didn't want to spend that much time on that issue so I just made the scope the top 1000 posts. I may swing back sometime to do more or even make the map continually updating. However, I have a ton of projects I want to do, so it's more an, if the stars line up thing.

Scraping reddit was simple enough, I did discover down the line, it makes sense to also grab the comments to better find the location of the picture, as the title obly has it sometimes and is unreliabe.

The map needed a reliable way to embed images and thumbnails so I also wrote a script to download the images for thumbnails and just wrote a small bash script to convert them to small thumbnails. 

## Finding the location
This is where I had fun, some posts had no real info in the title or the comments, so while I enjoyed playing Geoguessr I quickly realized it was not going to scale for this many posts. That's when I started to wonder if I could leverage an open-source and locally hosted LLM to help parse all of this info and put out potential likely locations.

### Local LLMs
I decided on Gemma-3 since it just came out and ran the 12B-instruct on my local machine using LMStudio. I wrote a script to ask the LLM with the post title and comments asking if it could identify any likely place. 

#### Prompt
I don't really use AI much, so I am very much not a proompter and kind of just guessed with this. It could be easy to make better, but it worked ok for me. 
```
SYSYEM PROMPT: 'You are a helpful assistant that can identify geographical locations from photo descriptions and discussions. Based on the post title and comments, help me figure out exactly where this photo was taken. Estimate the name of the place even if it is not just a town, like saying the name of a park, pass, rock, mountain, etc or geological feature. Please respond with only the estimated place name or "N/A" if you do not have enough info to make a good guess, Be descriptive, state and country name inclusions are good. (Good means specific, not just a continent or country name that is too vague). REPLY WITH ONLY THE LOCATION GUESS OR N/A'

Based on this photo title and comment information, what is the most specific geographical location being shown?
Title: {title}
Relevent Comments: {comment info}
```
Comments were pruned a bit to help fit in my 16k context window, this mainly was just looking for words that are commonly used with locations, as well as all from the OP. 

### Initial results
I initially just ran this over 10 posts to see how it did. If the location was mentioned in the title or in an OP comment it worked great, but where it struggled was seemingly picking up on the right location if multiple were mentioned in the comments. The locations were also fairly vauge. Many were just mentioning a national park name, rather than the lake or the trail, even if those were mentioned. 

A lot of posts too either never had a mentioned location, or were too vague outside of maybe a country, island or park. Overall I needed to go through and manually find locations for only about 100 posts. Which means that if 90% were enough to at least get a general location, thats a pretty decent rate for something like this. 

### The biggest issues
While the AI was pretty good at pulling general info out of the threads, the actual info, or the AI (Depending on the post) was bad at drilling down a specific location, this lead to some locations having dozens of posts assigned the same "location". Like (Glacier national park, Lofotoen islands, etc)

When getting to the next step, Geocoding, this proved problematic as dozens of posts will be assigned to the same place. To remedy this I went in and did my best to manually find the closest approxomation I could to where the post was taken from.

### Geocoding
For geocoding, 1000 requests is well within the Google maps free tier, this ended up working out really well for getting LAT/LON for the derived areas.

### Mapping this all out
For Mapping it was easy to just map all of this info to GeoJson and just create a basic leaflet map to throw this all into. 
