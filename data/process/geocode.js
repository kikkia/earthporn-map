const fs = require('fs').promises;
const axios = require('axios');

const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;

async function geocodeLocations(inputFile, outputFile) {
    try {
        const rawData = await fs.readFile(inputFile, 'utf8');
        let locations = JSON.parse(rawData);

        const locationsToGeocode = locations.filter(loc => !loc.lat || !loc.lon);

        for (let i = 0; i < locationsToGeocode.length; i++) {
            const location = locationsToGeocode[i];
            
            try {
                if (location.lat && location.lon) continue;

                const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                    params: {
                        address: location.location,
                        key: GOOGLE_MAPS_API_KEY
                    }
                });

                if (response.data.results && response.data.results.length > 0) {
                    const result = response.data.results[0].geometry.location;
                    location.lat = result.lat.toString();
                    location.lon = result.lng.toString();

                    console.log(`Geocoded: ${location.location} -> (${location.lat}, ${location.lon})`);
                } else {
                    console.warn(`Could not geocode: ${location.location}`);
                }

                await fs.writeFile(outputFile, JSON.stringify(locations, null, 2));

                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (geocodeError) {
                console.error(`Error geocoding ${location.location}:`, geocodeError.message);
            }
        }

        await fs.writeFile(outputFile, JSON.stringify(locations, null, 2));
        console.log(`Geocoding complete. Updated locations saved to ${outputFile}`);
    } catch (error) {
        console.error('Error processing locations:', error);
    }
}

const inputFile = 'geocoded_location_tweak.json';
const outputFile = 'geocoded_location.json';

geocodeLocations(inputFile, outputFile)
    .catch(err => console.error('Geocoding script failed:', err));