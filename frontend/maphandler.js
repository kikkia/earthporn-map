const map = L.map('map', {preferCanvas: true, worldCopyJump: true}).setView([35.652832, 139.700745], 6);
const welcomeContent = `<p>LoremIpsum</p>`

const base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    edgeBufferTiles: 2,
});
base.addTo(map);
const paddedRenderer = L.svg({ padding: 10 });
let postsLayer, clusterGroup;
let pointHeatmapLayer, upvoteHeatmapLayer;
let heatmapControl; 
loadGeoJSON();

const helloDialog =  L.control.window(map,{title:'Earthporn map', content: welcomeContent}).show()

async function loadGeoJSON() {
    try {
        response = await fetch('assets/posts.geojson')
            .then(response => response.json())
            .then(data => {
                postsLayer = L.geoJSON(data,
                {
                    style: setLocalStyle,
                    onEachFeature: setCellProps,
                    pointToLayer: function (feature, latlng) {
                        const circularIcon = L.divIcon({
                            className: 'circular-marker',
                            html: `
                                <div style="
                                    width: 36px; 
                                    height: 36px; 
                                    border-radius: 50%; 
                                    background-image: url('assets/thumbnails/${feature.properties.id}_thumbnail.jpg'); 
                                    background-size: cover; 
                                    background-position: center;
                                    border: 3px solid white; 
                                    box-shadow: 0 0 5px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.3);
                                    transition: all 0.2s ease-in-out;
                                    transform-origin: center bottom;
                                "></div>
                            `,
                            iconSize: [42, 42],
                            iconAnchor: [21, 42],
                            popupAnchor: [0, -42]
                        });
                        
                        return L.marker(latlng, { icon: circularIcon });
                    },
                    renderer: paddedRenderer
                })

                markerCluster(postsLayer);
                
                createHeatmapLayers(data);
                addHeatmapControls();
            })
            .catch(error => {
                console.error('Error loading point data:', error);
            });
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        return null;
    }
}

function markerCluster(dataLayer) {
    clusterGroup = L.markerClusterGroup();
    clusterGroup.addLayer(dataLayer);
    map.addLayer(clusterGroup);
}

function createHeatmapLayers(data) {
    const pointsMap = new Map();
    const upvotesMap = new Map();
    
    data.features.forEach(feature => {
        const lat = feature.geometry.coordinates[1];
        const lng = feature.geometry.coordinates[0];
        
        const locationKey = `${lat},${lng}`;
        
        if (pointsMap.has(locationKey)) {
            pointsMap.set(locationKey, {
                lat,
                lng,
                count: pointsMap.get(locationKey).count + 1
            });
        } else {
            pointsMap.set(locationKey, {
                lat,
                lng,
                count: 1
            });
        }
        
        const upvotes = feature.properties.upvotes || 0;
        if (upvotesMap.has(locationKey)) {
            upvotesMap.set(locationKey, {
                lat,
                lng,
                upvotes: upvotesMap.get(locationKey).upvotes + upvotes
            });
        } else {
            upvotesMap.set(locationKey, {
                lat,
                lng,
                upvotes
            });
        }
    });

    const pointHeatData = Array.from(pointsMap.values()).map(point => [
        point.lat,
        point.lng,
        point.count
    ]);

    console.log(pointHeatData)
    
    const upvoteHeatData = Array.from(upvotesMap.values()).map(point => [
        point.lat,
        point.lng,
        Math.log(point.upvotes + 1) / 10
    ]);
    
    pointHeatmapLayer = L.heatLayer(pointHeatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.5,
        max: 40,
        gradient: {
            0.2: 'blue',
            0.5: 'lime',
            0.8: 'red'
        }
    });
    
    upvoteHeatmapLayer = L.heatLayer(upvoteHeatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.6,
        max: 40,
        gradient: {
            0.2: 'green',
            0.5: 'yellow',
            0.8: 'red'
        }
    });
    
    setupHeatmapEvents();
}

function setupHeatmapEvents() {
    map.on('layeradd', function(e) {
        if (e.layer === pointHeatmapLayer || e.layer === upvoteHeatmapLayer) {
            setPointLayerOpacity(0.3); 
        }
        if (e.layer === clusterGroup) {
            map.removeLayer(postsLayer);
        }
    });
    
    map.on('layerremove', function(e) {
        if (e.layer === pointHeatmapLayer || e.layer === upvoteHeatmapLayer) {
            if (!isAnyHeatmapActive()) {
                setPointLayerOpacity(1.0); 
            }
        } else if (e.layer === clusterGroup) {
            map.addLayer(postsLayer);
        }
    });
}

function isAnyHeatmapActive() {
    return (map.hasLayer(pointHeatmapLayer) || map.hasLayer(upvoteHeatmapLayer));
}

function setPointLayerOpacity(opacity) {
    if (!postsLayer) return;
    
    postsLayer.eachLayer(function(layer) {
        const markerDiv = layer.getElement();
        if (markerDiv) {
            const innerDiv = markerDiv.querySelector('div');
            if (innerDiv) {
                innerDiv.style.opacity = opacity;
            }
        }
    });
}

function addHeatmapControls() {
    if (!heatmapControl) {
        const overlays = {
            "Heatmap": pointHeatmapLayer,
            "Upvotes Weighted Heatmap": upvoteHeatmapLayer,
            "Cluster nearby posts": clusterGroup
        };
        
        heatmapControl = L.control.layers(null, overlays, {
            collapsed: false,
            position: 'bottomright'
        }).addTo(map);
    }
}

function setLocalStyle(feature) {
    return {
        fillColor: feature.properties.fill,
        color: "#aaaaaa",
        fillOpacity: .4,
        opacity: .2
    };
}

function setCellProps(feature, layer){
    const popupContent = `
      <div>
        <h3>${feature.properties.title}</h3>
        <img src="assets/images/${feature.properties.id}.jpg" alt="${feature.properties.title}" style="width: 100%; height: auto; margin-bottom: 5px;" class="popup-image">
        <p><strong>Location:</strong> ${feature.properties.location}</p>
        <p><strong>Upvotes:</strong> ${feature.properties.upvotes}</p>
        <p><strong>Posted by:</strong> <a href="https://www.reddit.com/user/${feature.properties.author}" target="_blank">/u/${feature.properties.author}</a></p>
        <p><strong>Reddit Post:</strong> <a href="https://www.reddit.com/r/earthporn/comments/${feature.properties.id}" target="_blank">View on Reddit</a></p>
        </div>`;
    
    const popup = L.popup({
        autoPan: false,
        maxWidth: 400 
    }).setContent(popupContent);
    
    layer.bindPopup(popup);
    
    layer.on('popupopen', function(e) {
        const popup = e.popup;
        const popupContainer = popup._container;
        
        
        if (popupContainer) {
            const img = popupContainer.querySelector('.popup-image');
            
            if (img) {
                if (img.complete) {
                    setTimeout(() => centerPopupOnMap(popup), 100);
                } else {
                    img.onload = function() {
                        centerPopupOnMap(popup);
                    };
                    
                    img.onerror = function() {
                        centerPopupOnMap(popup);
                    };
                }
            } else {
                centerPopupOnMap(popup);
            }
        }
    });
}

function initialPanToPopup(popup) {
    const latlng = popup.getLatLng();
    
    const mapHeight = map.getSize().y;
    const offsetY = mapHeight * 0.3;
    
    const targetPoint = map.project(latlng).subtract([0, offsetY]);
    const targetLatLng = map.unproject(targetPoint);
    
    map.panTo(targetLatLng, {
        animate: true,
        duration: 0.25
    });
}

function centerPopupOnMap(popup) {
    const popupHeight = popup._container.offsetHeight;

    const targetPoint = map.project(popup.getLatLng())
        .subtract([0, popupHeight/2]); // Shift up by half popup height
    
    if (targetPoint.y < popupHeight/2) {
        targetPoint.y = popupHeight/2;
    }
    
    const targetLatLng = map.unproject(targetPoint);
    
    map.panTo(targetLatLng, {
        animate: true,
        duration: 0.5
    });
}

map.attributionControl.setPrefix(false)

const githubButton = L.Control.extend({
    options: {
        position: 'bottomleft'
    },

    onAdd: function (map) {
        const link = L.DomUtil.create('button', 'github-button');
        link.innerHTML = '<i class="fa fa-github" style="font-size:48px;color:black"></i>';
        link.onclick = function () {
            window.open("https://github.com/kikkia/earthporn-map", '_blank').focus()
        };
        return link;
    }
});

const infoButton = L.Control.extend({
    options: {
        position: 'bottomleft'
    },

    onAdd: function (map) {
        const button = L.DomUtil.create('button', 'info-button');
        button.innerHTML = '<i class="fa fa-info-circle" style="font-size:48px;color:black"></i>';
        button.onclick = function () {
            helloDialog.show();
        };
        return button;
    }
});

map.addControl(new githubButton());
map.addControl(new infoButton());
