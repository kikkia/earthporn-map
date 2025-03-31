const fs = require('fs');

const filePath = 'geocoded_location.json';

let overlap = {}

try {
  const rawData = fs.readFileSync(filePath, 'utf8');
  const posts = JSON.parse(rawData);

  const overlappingPosts = [];

  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const post1 = posts[i];
      const post2 = posts[j];

      const latDiff = Math.abs(parseFloat(post1.lat) - parseFloat(post2.lat));
      const lonDiff = Math.abs(parseFloat(post1.lon) - parseFloat(post2.lon));

      if (latDiff <= 0.0001 && lonDiff <= 0.0001) {
        if (!(overlap[post1.id] && overlap[post1.id].includes(post2.id)) &&
          !(overlap[post2.id] && overlap[post2.id].includes(post1.id))) {
            overlappingPosts.push({ post1: post1.id, post2: post2.id });
            if (!overlap[post1.id]) {
              overlap[post1.id] = [];
            }
            overlap[post1.id].push(post2.id);
          }
      }
    }
  }

  if (overlappingPosts.length > 0) {
    console.log('Found overlapping posts (within ~0.001 lat/long):');
    overlappingPosts.forEach(pair => {
      console.log(`- Post ID: ${pair.post1} overlaps with Post ID: ${pair.post2}`);
    });
    console.log(overlappingPosts.length)
  } else {
    console.log('No overlapping posts found within the specified range.');
  }

} catch (error) {
  console.error('Error reading or parsing the JSON file:', error);
}