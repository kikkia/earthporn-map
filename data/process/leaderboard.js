const fs = require('fs');

const geojsonInputFilePath = '../../frontend/assets/posts.geojson'; // Input GeoJSON file
const leaderboardOutputFilePath = 'leaderboard.json'; // Output file for the results

let geojsonData;
try {
    const fileContent = fs.readFileSync(geojsonInputFilePath, 'utf8');
    geojsonData = JSON.parse(fileContent);
    console.log(`Successfully read and parsed ${geojsonInputFilePath}`);
} catch (error) {
    console.error(`Error reading or parsing ${geojsonInputFilePath}:`, error.message);
    process.exit(1);
}

const authorStats = {};
const countryStats = {};

if (!geojsonData || geojsonData.type !== 'FeatureCollection' || !Array.isArray(geojsonData.features)) {
    console.error("Invalid GeoJSON structure in input file. Expected a FeatureCollection with a 'features' array.");
    process.exit(1);
}

geojsonData.features.forEach(feature => {
    if (feature.type === 'Feature' && feature.properties) {
        const props = feature.properties;
        const author = props.author;

        const upvotes = typeof props.upvotes === 'number' ? props.upvotes : 0;
        const country = props.country

        if (country) {
            if (!countryStats[country]) {
                countryStats[country] = {
                    postCount: 0,
                    totalUpvotes: 0
                }
            }

            countryStats[country].postCount += 1;
            countryStats[country].totalUpvotes += upvotes
        }

        if (author) { 
            if (!authorStats[author]) {
                authorStats[author] = {
                    postCount: 0,
                    totalUpvotes: 0
                };
            }

            authorStats[author].postCount += 1;
            authorStats[author].totalUpvotes += upvotes;
        } else {
            console.warn(`Feature with id ${props.id || 'N/A'} is missing an author property. Skipping author aggregation for this feature.`);
        }
    } else {
        console.warn("Skipping an item that is not a valid GeoJSON Feature or is missing properties.");
    }
});
console.log("Finished aggregating author statistics.");


const authorLeaderboardArray = Object.entries(authorStats).map(([author, stats]) => {
    return {
        author: author,
        postCount: stats.postCount,
        totalUpvotes: stats.totalUpvotes
    };
});

const countryLeaderboardArray = Object.entries(countryStats).map(([country, stats]) => {
    return {
        country: country,
        postCount: stats.postCount,
        totalUpvotes: stats.totalUpvotes
    };
});

authorLeaderboardArray.sort((a, b) => b.totalUpvotes - a.totalUpvotes);
countryLeaderboardArray.sort((a, b) => b.totalUpvotes - a.totalUpvotes);
console.log("Leaderboard sorted by total upvotes (descending).");

const authorLeaderboardJson = JSON.stringify(authorLeaderboardArray, null, 2);
const countryLeaderboardJson = JSON.stringify(countryLeaderboardArray, null, 2);

try {
    fs.writeFileSync("author_" + leaderboardOutputFilePath, authorLeaderboardJson, 'utf8');
    fs.writeFileSync("country_" + leaderboardOutputFilePath, countryLeaderboardJson, 'utf8');
    console.log(`Leaderboard successfully saved to ${leaderboardOutputFilePath}`);
} catch (error) {
    console.error(`Error writing leaderboard to file ${leaderboardOutputFilePath}:`, error.message);
    process.exit(1);
}