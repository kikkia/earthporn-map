const postGuessr = (function() {

    const NUM_ROUNDS = 5;
    const MAX_SCORE_PER_ROUND = 5000;
    const MAX_DISTANCE_FOR_SCORE = 1250000;
    const POSTS_GEOJSON_URL = 'assets/posts.geojson'; 
    const LOCATION_FIX_URL = "https://github.com/kikkia/earthporn-map/issues/new?template=location-update-request.md";

    let map = null; 
    let postsData = null;
    let gameActive = false;
    let currentRound = 0;
    let totalScore = 0;
    let gamePosts = [];
    let currentPost = null;
    let currentGuessLatLng = null;
    let guessMarker = null;
    let actualMarker = null;
    let resultLine = null;
    let initialMapBounds = [[-60, -170], [75, 180]];

    let UIGameContainer = null;
    let UIImageContainer = null;
    let UIImageDisplay = null;
    let UIMapContainer = null;
    let UIRoundInfo = null;
    let UIScoreInfo = null;
    let UIDistanceInfo = null;
    let UISubmitButton = null;
    let UINextButton = null;
    let UIFixButton = null;
    let UIFixInfo = null;
    let UIResultsContainer = null;
    let UIFinalScore = null;
    let UIPlayAgainButton = null;

    function init() {
        console.log("Initializing PostGuessr Game Page...");
        getUIElements(); 
        setupEventListeners();

        const navInfoLinkGame = document.getElementById('nav-info-link');
        if (navInfoLinkGame) {
            navInfoLinkGame.addEventListener('click', (event) => {
                event.preventDefault();
                alert("EarthPorn GeoGuessr: Guess the location of top posts from r/EarthPorn! Created based on the EarthPorn Heatmap project.");
            });
        }

        if (UIDistanceInfo) UIDistanceInfo.textContent = 'Loading locations...';

        fetch(POSTS_GEOJSON_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                postsData = data?.features;
                if (!postsData || postsData.length < NUM_ROUNDS) {
                     console.error("Not enough post data found.");
                     throw new Error("Not enough locations available to play.");
                }
                console.log(`Loaded ${postsData.length} locations.`);
                createMap(); 
                startGame();
            })
            .catch(error => {
                console.error("Failed to load GeoJSON data:", error);
                if(UIRoundInfo) UIRoundInfo.textContent = 'Error';
                if (UIDistanceInfo) UIDistanceInfo.textContent = `Failed to load game data: ${error.message}. Please try again later.`;
                hideElement(UISubmitButton);
                hideElement(UINextButton);
                hideElement(UIFixButton);
                hideElement(UIFixInfo);
            });
    }

    function getUIElements() {
        UIImageContainer = document.getElementById('postguessr-image-container');
        UIImageDisplay = document.getElementById('postguessr-image');
        UIMapContainer = document.getElementById('guess-map');
        UIRoundInfo = document.getElementById('postguessr-round-info');
        UIScoreInfo = document.getElementById('postguessr-score-info');
        UIDistanceInfo = document.getElementById('postguessr-distance-info');
        UISubmitButton = document.getElementById('postguessr-submit-button');
        UINextButton = document.getElementById('postguessr-next-button');
        UIFixButton = document.getElementById('postguessr-fix-button');
        UIFixInfo = document.getElementById('postguessr-fix-info');
        UIResultsContainer = document.getElementById('postguessr-results-container');
        UIFinalScore = document.getElementById('postguessr-final-score');
        UIPlayAgainButton = document.getElementById('postguessr-play-again-button');
        console.log("UI Elements Refs:", { UIImageDisplay, UIMapContainer, UIRoundInfo /* ... etc */ });
    }

    function setupEventListeners() {
        if (UISubmitButton) UISubmitButton.addEventListener('click', submitGuess);
        if (UINextButton) UINextButton.addEventListener('click', nextRound);
        if (UIPlayAgainButton) UIPlayAgainButton.addEventListener('click', resetGame);
        if (UIFixButton) UIFixButton.addEventListener('click', suggestFix);
    }

    function createMap() {
        if (!UIMapContainer) {
            console.error("Map container element not found!");
            return;
        }
        map = L.map(UIMapContainer, {
            worldCopyJump: true,
            minZoom: 2,
            maxZoom: 18,
        }).fitWorld();

        try {
           map.fitBounds(initialMapBounds);
        } catch(e) {
            console.warn("Could not fit initial bounds, falling back to fitWorld.");
            map.fitWorld();
        }


        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="http://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19,
        }).addTo(map);

        console.log("Guess map created.");
    }

    function showView(view) {
        hideElement(UIResultsContainer);
        hideElement(UISubmitButton);
        hideElement(UINextButton);
        hideElement(UIFixButton);
        hideElement(UIFixInfo);

        if (view === 'game') {
   
        } else if (view === 'results') {
            showElement(UIResultsContainer);
        }
    }

    function showElement(el) {
        if (el) el.style.display = el.tagName === 'BUTTON' ? 'inline-block' : 'block';
    }
    function hideElement(el) {
        if (el) el.style.display = 'none';
    }

    function startGame() {
        console.log("Starting game...");
        gameActive = true;
        currentRound = 0;
        totalScore = 0;
        gamePosts = selectRandomPosts(postsData, NUM_ROUNDS);

        if (!gamePosts || gamePosts.length < NUM_ROUNDS) {
            console.error("Failed to select enough unique posts for the game.");
            if (UIDistanceInfo) UIDistanceInfo.textContent = "Error starting game: Not enough unique locations found.";
            gameActive = false;
            return;
        }

        console.log("Selected posts for game:", gamePosts.map(p => p.properties.id));
        showView('game');
        nextRound();
    }

    function selectRandomPosts(allPosts, count) {
        if (!allPosts || allPosts.length < count) return null;
        const shuffled = [...allPosts].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function startRound() {
        console.log(`Starting Round ${currentRound}`);
        currentGuessLatLng = null;
        clearMapElements();

        currentPost = gamePosts[currentRound - 1];
        const properties = currentPost.properties;
        const imageUrl = `assets/images/${properties.id}.jpg`;

        if (UIImageDisplay) {
             UIImageDisplay.style.opacity = 0;
             setTimeout(() => {
                 UIImageDisplay.src = imageUrl;
                 UIImageDisplay.onload = () => UIImageDisplay.style.opacity = 1; // Fade in new image
                 UIImageDisplay.onerror = () => {
                      UIImageDisplay.alt = "Error loading image";
                      UIImageDisplay.style.opacity = 1;
                 };
             }, 300);
        } else {
            console.warn("UIImageDisplay element not found");
        }

        if (UIRoundInfo) UIRoundInfo.textContent = `Round ${currentRound} / ${NUM_ROUNDS}`;
        if (UIDistanceInfo) UIDistanceInfo.textContent = 'Click on the map to make your guess.';
        if (UIScoreInfo) UIScoreInfo.textContent = `Total Score: ${totalScore}`;

        hideElement(UINextButton);
        hideElement(UISubmitButton);
        hideElement(UIFixButton);
        hideElement(UIFixInfo);
        UISubmitButton.disabled = true;

        
        map.setView([20, 0], 2);

        map.on('click', handleMapClick);
        if (UIMapContainer) UIMapContainer.style.cursor = 'crosshair';
    }

    function handleMapClick(e) {
        if (!gameActive) { 
             if (actualMarker && map.hasLayer(actualMarker)) return;
        }

        currentGuessLatLng = e.latlng;
        console.log("Guess placed at:", currentGuessLatLng);

        if (guessMarker) {
            map.removeLayer(guessMarker);
        }
        
        guessMarker = L.marker(currentGuessLatLng, { draggable: false }).addTo(map);
        guessMarker.bindPopup("Your Guess").openPopup();

        if (UIDistanceInfo) UIDistanceInfo.textContent = 'Guess placed. Click Submit.';
        if (UISubmitButton) {
            showElement(UISubmitButton);
            UISubmitButton.disabled = false;
        }
    }

    function submitGuess() {
        if (!currentGuessLatLng || !currentPost || !map) return;

        console.log("Submitting guess...");
        UISubmitButton.disabled = true;
        map.off('click', handleMapClick);
        if (UIMapContainer) UIMapContainer.style.cursor = '';

        const actualCoords = currentPost.geometry.coordinates;
        const actualLatLng = L.latLng(actualCoords[1], actualCoords[0]);

        const actualIcon = L.divIcon({
            className: 'actual-location-icon',
            html: `<img src="assets/thumbnails/${currentPost.properties.id}_thumbnail.jpg" style="width: 30px; height: 30px;">`,
            iconSize: [30, 30], 
            iconAnchor: [15, 15] 
        });
        actualMarker = L.marker(actualLatLng, { icon: actualIcon }).addTo(map);
        actualMarker.bindPopup(`Actual Location: ${currentPost.properties.location || currentPost.properties.title}`).openPopup(); // Use location field if available

        const distance = map.distance(currentGuessLatLng, actualLatLng);
        const roundScore = calculateScore(distance);
        totalScore += roundScore;

        console.log(`Distance: ${Math.round(distance / 1000)} km, Score: ${roundScore}`);

        resultLine = L.polyline([currentGuessLatLng, actualLatLng], { color: 'blue', weight: 2, dashArray: '5, 5' }).addTo(map);

        if (UIDistanceInfo) UIDistanceInfo.textContent = `Distance: ${formatDistance(distance)}`;
        if (UIScoreInfo) UIScoreInfo.textContent = `Round Score: ${roundScore} | Total Score: ${totalScore}`;
        if (UIFixInfo) UIFixInfo.textContent = `Post ID: ${currentPost.properties.id}`

        hideElement(UISubmitButton);
        showElement(UINextButton);
        showElement(UIFixButton);
        showElement(UIFixInfo);

        map.flyToBounds(L.latLngBounds(currentGuessLatLng, actualLatLng), { padding: [30, 30], maxZoom: 16 });
    }

    function calculateScore(distance) {
        if (distance < 50) return MAX_SCORE_PER_ROUND;
        if (distance > MAX_DISTANCE_FOR_SCORE) return 0;

        const score = MAX_SCORE_PER_ROUND * Math.pow(1 - (distance / MAX_DISTANCE_FOR_SCORE), 1.5);
        return Math.round(score);
    }

    function formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        } else {
            return `${(meters / 1000).toFixed(1)} km`;
        }
    }

    function nextRound() {
        currentRound++;
        if (currentRound <= NUM_ROUNDS) {
            startRound();
        } else {
            endGame();
        }
    }

    function endGame() {
        console.log("Game Over! Final Score:", totalScore);
        gameActive = false;
        if (UIMapContainer) UIMapContainer.style.cursor = '';

        showView('results');
        if (UIFinalScore) UIFinalScore.innerHTML = `<h2>Game Over!</h2><p>Your Final Score: ${totalScore} / ${NUM_ROUNDS * MAX_SCORE_PER_ROUND}</p>`;
    }

    function resetGame() {
        // Easiest way to reset everything cleanly is to reload the page
        window.location.reload();
    }

    function suggestFix() {
        window.open(LOCATION_FIX_URL, '_blank').focus();
    }

    function clearMapElements() {
        if (guessMarker && map.hasLayer(guessMarker)) map.removeLayer(guessMarker);
        if (actualMarker && map.hasLayer(actualMarker)) map.removeLayer(actualMarker);
        if (resultLine && map.hasLayer(resultLine)) map.removeLayer(resultLine);
        guessMarker = null;
        actualMarker = null;
        resultLine = null;
    }


    if (document.readyState === 'loading') { 
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();