# [r/EarthPorn heatmap / Guessr game](https://earthporn.kikkia.dev)

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

#### 1. Title, Comments, Photo -> Location

| Post Title                                                                                             | Real Location                                  | Gemma 3-12-it                    | Gemini 2.5 Flash                     | Gemini 2.5 Pro                      | Thoughts |
| :-------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- | :----------------------------------------------- | :-------------------------------------------------- | :------------------------------------------------- | ------ |
| [Chased a winter storm overnight into Yosemite...](https://redd.it/5tb4yq)                                      | Tunnel View, Yosemite Valley                           | Tunnel View, Yosemite National Park, California 👌 USA | Yosemite Valley 👎                                    | Tunnel View, Yosemite National Park, California 👌   | Even though the photo is from a famous spot AND Tunnel view is mentioned in the comments we see flash miss it. Which starts a small trend for flash.  |
| [Rainbow Falls, Mammoth Mountain...](https://redd.it/88qdpo)                                                    | Rainbow Falls, Mammoth Lakes, California               | Rainbow Falls, Mammoth Mountain, California 👌     | Rainbow Falls, Devils Postpile National Monument, California 👌 | Rainbow Falls, Mammoth Lakes, CA 👌                  | All of them nailed it |
| [Beautiful sunrise over the North Shore...](https://redd.it/9j8rur)                                             | Hollow Rock, Grand Portage, Minnesota           | Hollow Rock, Grand Portage, Minnesota 👌           | Hollow Rock, Grand Portage, Minnesota 👌              | Hollow Rock, Lake Superior, Minnesota, USA 👌        | Another one where they all guess correctly |
| [I caught a photo of 3 levels of mountain lakes...](https://redd.it/e2l2sf)                                     | Stuvdalsvatnet                                         | Hermannsdalstinden, Moskenesøya, Lofoten, Norway 🆗 | Munkebu area, Lofoten, Norway 🆗                 | Stuvdalsvatnet and Tridalsvatnet, Lofoten, Norway 🆗 | This one was surpising as the name is not mentioned in the comments or title, however not on the money, the LLMs all got withing the general area. I was surprised to see this. |
| [A few days ago I got this shot looking down...](https://redd.it/cr5ue3)                                        | Nesstraumen, Lofoten Islands, Norway | Lofoten Islands, Norway 👎                         | Lofoten, Norway 👎  | Flakstadøya, Lofoten, Norway 👎                      | One of the 2 extremely hard ones, I would have been blown away if any guessed this small straight. |
| [Cherry blossom park Amsterdam...](https://redd.it/mh36ug)                                                      | Bloesempark in Amsterdamse Bos                         | Bloesempark, Amsterdamse Bos 👌                    | Bloesempark, Amsterdamse Bos, Amstelveen, Netherlands 👌 | Bloesempark, Amsterdamse Bos, Amstelveen, Netherlands 👌 | Another easy one for them |
| [For a 15-minute period during my flight back...](https://redd.it/6t89rv)                                       | Near Scoresby Sund                                     | Scoresby Sund 👌                                   | Greenland 👎                                          | Prins Christian Sund, Greenland 👎                 | The general Sund is mentioned in the comments but only Gemma seemed to pick up on it. I reran this with the Gemini models ensuring that the comment was included, but neither picked it out. Maybe its too remote for them to want to put their guess there? Not sure.  |
| [Chiba, Japan By Takahiro Hosoe](https://redd.it/8hh1sc)                                                        | Nōmizo Falls, Sasa, Kimitsu, Chiba Prefecture, Japan | 濃溝の滝 and Kameiwa Cave, Sasa, Kimitsu, Chiba 👌Prefecture, Japan | Kameiwa Cave, Chiba, Japan 👌                         | Kameiwa Cave (Nomizo Waterfall), Kimitsu, Chiba, Japan 👌 | Location was buried deep in the comments and they all grabbed it. Slightly interesting how Gemma copy pasted from the comment but the others generalized. |

I am no LLM expert but I cannot help but wonder if the simplicity of Gemma comparitively stopped it from overthinking and fumbling some of the easier locations. 🤔


#### 2. Geocoding Location -> Latitude/Longitude

| Post Title (Link)                                                                                             | Real Lat/Lon                  | Gemma 3-12-it Lat/Lon       | Gemma Distance (km) | Gemini 2.5 Flash Lat/Lon    | Flash Distance (km) | Gemini 2.5 Pro Lat/Lon      | Pro Distance (km) |
| :-------------------------------------------------------------------------------------------------------------- | :---------------------------- | :-------------------------- | :------------------ | :-------------------------- | :------------------ | :-------------------------- | :---------------- |
| [Chased a winter storm overnight into Yosemite...](https://redd.it/5tb4yq)                                      | (37.7158, -119.6771)          | (37.7422, -119.5601)        | 10.7                | (37.7183, -119.6772)        | 0.30                | (37.7156, -119.6774)        | 0.03 ⭐             |
| [Rainbow Falls, Mammoth Mountain...](https://redd.it/88qdpo)                                                    | (37.5955, -119.0888)          | (37.6481, -119.0332)        | 7.6                 | (37.6131, -119.0814)        | 2.0 ⭐              | (37.6030, -119.0160)        | 6.4              |
| [Beautiful sunrise over the North Shore...](https://redd.it/9j8rur)                                             | (47.9179, -89.7381)           | (48.6372, -92.4034)        | 213               | (47.9680, -89.6690)        | 7.6 ⭐              | (47.9503, -89.8608)        | 9.8             |
| [I caught a photo of 3 levels of mountain lakes...](https://redd.it/e2l2sf)                                     | (67.8998, 12.9981)            | (67.7439, 12.0831)        | 42.1                | (67.9697, 13.0936)        | 8.7                 | (67.9512, 13.0035)        | 5.7 ⭐              |
| [A few days ago I got this shot looking down...](https://redd.it/cr5ue3)                                        | (68.0445, 13.1618)            | (68.3422, 12.1905)        | 52                | (68.0900, 13.5800)        | 18.1               | (68.0930, 13.3050)        | 8.0 ⭐              |
| [Cherry blossom park Amsterdam...](https://redd.it/mh36ug)                                                      | (52.3039, 4.8355)             | (52.3841, 5.2690)         | 30.8                | (52.3068, 4.8474)         | 0.9                 | (52.3090, 4.8300)         | 0.7 ⭐              |
| [For a 15-minute period during my flight back...](https://redd.it/6t89rv)                                       | (69.9976, -27.3740)           | (70.6422, -23.0000)        | 178.8               | (71.0000, -26.0000)        | 122.6 ⭐            | (60.1130, -43.7560)        | 1332.0            |
| [Chiba, Japan By Takahiro Hosoe](https://redd.it/8hh1sc)                                                        | (35.1854, 140.0601)           | (35.4281, 140.1969)        | 29.7                | (35.2360, 139.9910)        | 8.4                | (35.1815, 140.0435)        | 1.6 ⭐              |

*Note: Distances are approximate and calculated using the Haversine formula.*

Here we see a clear victory for the larger reasoning models. However unsurprisingly, none of them reach the kind of accuracy near Google Geocoding API or any other purpose built solution. However if this was someone playing GeoGussr I think these results look quite a bit better in that context. 

#### After all
At the end of the day, I really like Geoguessr and 1000 requests is well within the Google maps free tier. I used Gemma to do the comment,post,photo analysis and if there was any uncertainty, told the LLM to just return N/A and I did it manually. This ended up working out really well, about 50 total posts needed some Geoguessr, and then plugging it into the geocoding api. 

### Mapping this all out
For Mapping it was easy to just map all of this info to GeoJson and just create a basic leaflet map to throw this all into. 
