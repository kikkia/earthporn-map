# [r/EarthPorn heatmap](https://earthporn.kikkia.dev)

![image](https://github.com/user-attachments/assets/2237ec3d-386c-4c8f-8bbd-0b3dd24293f4)

I was curious about the density and representation of posts on the r/Earthporn subreddit, so I decided to take some time and map this out. This map takes the top 1000 posts of all time on that subreddit and maps them as accuratly as I could do it without spending an insane amount of time doing it totally manually.

## Getting the data
I wanted to do more than 1000 posts but unfortunately reddit only shows the last 1000 posts for any given sort option (Top/All time). I didn't want to spend that much time on that issue so I just made the scope the top 1000 posts. I may swing back sometime to do more or even make the map continually updating. However, I have a ton of projects I want to do, so it's more an, if the stars line up thing.

Scraping reddit was simple enough, I did discover down the line, it makes sense to also grab the comments to better find the location of the picture, as the title obly has it sometimes and is unreliabe.

The map needed a reliable way to embed images and thumbnails so I also wrote a script to download the images for thumbnails and just wrote a small bash script to convert them to small thumbnails. 

## Finding the location 
The next hurdle for this project to map all of the posts out was to reliably translate a post to its coordinates, not always easy as many users leave out details from their posts. This is where I had the most fun, some posts had no real info in the title or the comments, so while I enjoyed playing Geoguessr I quickly realized it was not going to scale for this many posts. That's when I started to wonder if I could leverage an open-source and locally hosted LLM to help parse all of this info and put out potential likely locations.

To help make the results of this test more digestable, I will be using only the results of 8 posts. These have a mix of data quality, popularity and vaugeness. To see where the LLM struggles to guess and where it might excell. 

| Thumbnail | Title | Reason |
|---|---|---|
|![5tb4yq_thumbnail](https://github.com/user-attachments/assets/a9e8aca3-62dd-4193-82e2-f3005770505e) | [Chased a winter storm overnight into Yosemite. Caught the sunrise.](https://redd.it/5tb4yq) | This shot is taken at tunnel view, a popular photo spot, but makes no mention of that, in the title or comments. This gives a good opportunity to see if the AI using the image context can infer the location better. |
| ![88qdpo_thumbnail](https://github.com/user-attachments/assets/7083aab8-cc32-4969-8391-8ef29fa8cdde) | [Rainbow Falls, Mammoth Mountain on opening Day 2017 after a long winter](https://redd.it/88qdpo) | This is the most easy and basic example, where the location is even in the title |
|![9j8rur_thumbnail](https://github.com/user-attachments/assets/01202ef7-10a9-4cfd-8649-ce7febce41fe) | [Beautiful sunrise over the North Shore in Minnesota](https://redd.it/9j8rur) | Vague title, but distinct image. Possible to infer from comment context what the image is of on the shore. Giving the AI opportunity to make some inferences about where it could be taken. |
| ![e2l2sf_thumbnail](https://github.com/user-attachments/assets/19c18af4-9f0e-46d9-b47a-d52e5cff5ed2) | [I caught a photo of 3 levels of mountain lakes while visiting Lofoten](https://redd.it/e2l2sf) | I manually worked on geoguessing this one and even with reverse image search containing some similar images, actually finding the lake chain was more challenging than I thought. Making for a good test. |
| ![cr5ue3_thumbnail](https://github.com/user-attachments/assets/c4d22c6f-48ce-4595-aa41-0ba56df7ee3e) | [A few days ago I got this shot looking down at Lofoten (Norway) with low clouds rolling in](https://redd.it/cr5ue3) | Another one with a general location in the title, No real location to geocode, I found it based of of distinct coastal features, but maybe the AI models can find enough context there for some attempt |
| ![mh36ug_thumbnail](https://github.com/user-attachments/assets/3d2632b1-6632-4af2-aec2-27af83c2efd7) | [Cherry blossom park Amsterdam, the Netherlands](https://redd.it/mh36ug) | Plenty of context in the title and comments, and existing images of this park. Should be a good easy case to test with. |
| ![6t89rv_thumbnail](https://github.com/user-attachments/assets/03120d37-bd3a-4362-a8aa-69d942790e12) | [For a 15-minute period during my flight back to Canada yesterday, there were no clouds blocking the view over Greenland's glaciers and icebergs](https://redd.it/6t89rv) | An absolute hail mary. I had to manually go find this one based on mountain and glacier patterns. Good luck AI, lets see if its even in the right ballpark |
| ![8hh1sc_thumbnail](https://github.com/user-attachments/assets/a879b69d-929b-4956-bd2b-1502b016e14a) | [Chiba, Japan By Takahiro Hosoe](https://redd.it/8hh1sc) | Low comment and title context, good photo. I found it based on reverse image search pretty quick. Should be a pretty doable moderate difficulty |


### LLM in testing
I selected 3 models for this test based around general competancy and cost. This isnt a test of which of all models is best, its more about testing IF a LLM can do this decently, and also IF there is noticable gains from using more capable models. The 3 selected models were:
- Gemma3-12-it, Ran locally
- Gemini-2.5-flash
- Gemini-2.5-pro

### Getting a geocodable location. 
The first step entailed getting a pretty decent google maps searchable location that approximately determined where the post was. This is useful for when the subsequent query for Lat/Lon feeding the narrowed down approximations could help it narrow down it's lat/lon guesses towards whereever that general location was. I fed 3 main data sources to the LLMs, Image, Title and Comments

#### Comment filtering
In order to keep as small as possible of a input context to avoid issues with context size, I did do some general pruning on the comments. Comments must meet one of the following:
- Be in a comment tree containing OP
- Have one of many location related words present

#### Can they actually Geocode?
As a stretch I thought it might be fun to also ask them to take the narrowed down locations and also try to give a lat/lon from that and the photo.

### Results
| Post | Real location | Gemma3 Location | 2.5 Pro | 2.5 Flash |
| ------ | ------ | ------ | ------ | ------ |
| [Chased a winter storm overnight into Yosemite. Caught the sunrise.](https://redd.it/5tb4yq) | Tunnel View, Yosemite Valley (37.715797, -119.677096) | | | |
| [Rainbow Falls, Mammoth Mountain on opening Day 2017 after a long winter](https://redd.it/88qdpo) | Rainbow Falls, Mammoth Lakes, California (37.595503, -119.088754)  | | | |
| [Beautiful sunrise over the North Shore in Minnesota](https://redd.it/9j8rur) | Hollow Rock Resort, Grand Portage, Minnesota (47.917888, -89.7380656) | | | |
| [I caught a photo of 3 levels of mountain lakes while visiting Lofoten](https://redd.it/e2l2sf) | Stuvdalsvatnet (67.8998233, 12.9981109) | | | |
| [A few days ago I got this shot looking down at Lofoten (Norway) with low clouds rolling in](https://redd.it/cr5ue3) | Lofoten Islands, Norway (68.044457, 13.161771)  | | | |
| [Cherry blossom park Amsterdam, the Netherlands](https://redd.it/mh36ug) | Bloesempark in Amsterdamse Bos (52.3039376, 4.8355025) | | | |
| [For a 15-minute period during my flight back to Canada yesterday, there were no clouds blocking the view over Greenland's glaciers and icebergs](https://redd.it/6t89rv) | Near Scoresby Sund (69.997639, -27.373977) | | | |
| [Chiba, Japan By Takahiro Hosoe](https://redd.it/8hh1sc) | Nōmizo Falls, Sasa, Kimitsu, Chiba Prefecture, Japan (35.1854017, 140.0601268) | | | |



#### Prompt
I don't really use AI much, so I am very much not a proompter and kind of just guessed with this. It could be easy to make better, but it worked ok for me. 
```
SYSYEM PROMPT: 'You are a helpful assistant that can identify geographical locations from photo descriptions and discussions. Based on the post title and comments, help me figure out exactly where this photo was taken. Estimate the name of the place even if it is not just a town, like saying the name of a park, pass, rock, mountain, etc or geological feature. Please respond with only the estimated place name or "N/A" if you do not have enough info to make a good guess, Be descriptive, state and country name inclusions are good. (Good means specific, not just a continent or country name that is too vague). REPLY WITH ONLY THE LOCATION GUESS OR N/A'

Based on this photo title and comment information, what is the most specific geographical location being shown?
Title: {title}
Relevent Comments: {comment info}
```
Comments were pruned a bit to help fit in my 16k context window, this mainly was just looking for words that are commonly used with locations, as well as all from the OP. 

#### Initial results
I initially just ran this over 10 posts to see how it did. If the location was mentioned in the title or in an OP comment it worked great, but where it struggled was seemingly picking up on the right location if multiple were mentioned in the comments. The locations were also fairly vauge. Many were just mentioning a national park name, rather than the lake or the trail, even if those were mentioned. 

A lot of posts too either never had a mentioned location, or were too vague outside of maybe a country, island or park. Overall I needed to go through and manually find locations for only about 100 posts. Which means that if 90% were enough to at least get a general location, thats a pretty decent rate for something like this. 

#### The biggest issues
While the AI was pretty good at pulling general info out of the threads, the actual info, or the AI (Depending on the post) was bad at drilling down a specific location, this lead to some locations having dozens of posts assigned the same "location". Like (Glacier national park, Lofotoen islands, etc)

When getting to the next step, Geocoding, this proved problematic as dozens of posts will be assigned to the same place. To remedy this I went in and did my best to manually find the closest approxomation I could to where the post was taken from.

### Giving a shot to the newest most powerful LLMs
I decided to see if any of the new reasoning models that also could use the images themselves would fare any better. Using AI studio I gave a try to both Gemini 2.5 pro and Gemini 2.5 flash. They were given the same system prompts, but were also fed the images as well for hopefully some more context. 

#### Improvments
The results were both a little better than local Gemma (but more expensive) By adding the images these models were able to, in some cases, take a post for somewhere like Yosemete park and then given the image, if that image was at a famous spot, be able to infer the viewpoint, even if not mentioned in the post comments. This was a nice small improvement. I want to rerun these tests also passing in the image to Gemma as well to see how much it can catch up with the added context there.  

### Geocoding
Now that we have the rough human readable locations, they need to be translated to lat/lon coordinates for use in our map. I tried a moonshot with all of the LLMs to see how they compare to something like the Google maps geocode api. 

#### Comparing on an even plane
Just feeding the text description of the location to any of the 3 LLMs never gave a good coordinate, however they ususally were in a decent ballpark. Specifically 2.5 pro and flash. Gemma3 was very far back in this case, usually miles or more off. Whereas 2.5pro and flash could sometimes be within a mile of the result from Google maps API. Another issue was consitency, 2 requests with the same location often came back with differing coordintates. 

#### Adding the photo for context
Would adding the photo for some more context help with the accuracy? I fed the location and photo back into the AI asking for a LAT/LON again to see if now with a much more focused prompt, it could get a better guess.


#### After all
At the end of the day, 1000 requests is well within the Google maps free tier, this ended up working out really well for getting LAT/LON for the derived areas. Even though this didn't give an 2nd opporitunity for the AI to drill down more on the location, it also didn't give another chance for the AI to go awol either. 

### Mapping this all out
For Mapping it was easy to just map all of this info to GeoJson and just create a basic leaflet map to throw this all into. 
