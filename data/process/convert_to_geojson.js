const { features } = require('process');

const fs = require('fs').promises;

const inputFile = 'geocoded_location.json';
const outputFile = 'posts.geojson';

async function convertToGeojson() {
    const rawData = await fs.readFile(inputFile, 'utf8');
    let locations = JSON.parse(rawData);
    let geoLocations = {type: "FeatureCollection", features: []}

    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];

        let feature = {type: "Feature", geometry: {
            type: "Point",
            coordinates: [parseFloat(location.lon), parseFloat(location.lat)]
        }, properties: {
            title: location.title,
            upvotes: location.ups,
            comments: location.comments,
            created: location.created,
            id: location.id,
            author: location.author,
            location: location.location
        }}

        geoLocations.features.push(feature)
    }
    console.log("Done")
    await fs.writeFile(outputFile, JSON.stringify(geoLocations, null, 2));
}

convertToGeojson()