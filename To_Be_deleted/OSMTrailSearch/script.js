// Initialize map
const map = L.map('map').setView([47.2692, 11.4041], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Add aerial view
const aerialLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
});

// Create a layer group for trails
const trailLayer = L.layerGroup().addTo(map);

// Create search radius circle
let searchRadius = null;
let searchRadiusFill = null;
let searchRadiusMask = null;
let bufferCircles = [];
const SEARCH_RADIUS = 5000; // 5km in meters
const BUFFER_COUNT = 5; // Number of concentric circles

// Function to update radius circle position
function updateRadiusPosition() {
    if (searchRadius && searchRadiusFill && searchRadiusMask) {
        const center = map.getCenter();
        searchRadius.setLatLng(center);
        searchRadiusFill.setLatLng(center);
        searchRadiusMask.setLatLng(center);
        bufferCircles.forEach(circle => circle.setLatLng(center));
    }
}

// Function to create search radius
function createSearchRadius(center) {
    // Create the main circle
    searchRadius = L.circle(center, {
        radius: SEARCH_RADIUS,
        className: 'search-radius'
    }).addTo(map);

    // Create the fill circle
    searchRadiusFill = L.circle(center, {
        radius: SEARCH_RADIUS,
        className: 'search-radius-fill'
    }).addTo(map);

    // Create buffer circles with decreasing opacity
    bufferCircles = [];
    for (let i = 1; i <= BUFFER_COUNT; i++) {
        const bufferRadius = SEARCH_RADIUS * (1 + (i * 0.5));
        const opacity = 0.3 - (i * 0.1);
        const bufferCircle = L.circle(center, {
            radius: bufferRadius,
            className: 'search-radius-buffer',
            fillOpacity: opacity
        }).addTo(map);
        bufferCircles.push(bufferCircle);
    }

    // Create a larger circle for the mask effect
    searchRadiusMask = L.circle(center, {
        radius: SEARCH_RADIUS * (1 + (BUFFER_COUNT * 0.5)),
        className: 'search-radius-mask'
    }).addTo(map);
}

// Create side panel
const sidePanel = document.createElement('div');
sidePanel.className = 'side-panel';
sidePanel.innerHTML = `
    <div class="panel-header">
        <div class="panel-title">MTB Trail Search Engine</div>
        <div class="toggle-button">×</div>
    </div>
    <div class="search-form">
        <input type="text" class="search-input" placeholder="Search location...">
        <button class="search-button">Search Location</button>
    </div>
    <div class="trail-list"></div>
`;
document.body.appendChild(sidePanel);

// Get references to elements
const trailList = sidePanel.querySelector('.trail-list');
const toggleButton = sidePanel.querySelector('.toggle-button');
const searchInput = sidePanel.querySelector('.search-input');
const locationSearchButton = sidePanel.querySelector('.search-button');

// Toggle panel visibility
toggleButton.addEventListener('click', () => {
    if (sidePanel.style.display === 'none') {
        sidePanel.style.display = 'flex';
        map.setView(map.getCenter(), map.getZoom());
    } else {
        sidePanel.style.display = 'none';
        trailList.innerHTML = '';
        map.setView(map.getCenter(), map.getZoom());
    }
});

// Function to search location
async function searchLocation(query) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const location = data[0];
            map.setView([location.lat, location.lon], 13);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error searching location:', error);
        return false;
    }
}

// Add search form event listeners
locationSearchButton.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (query) {
        const found = await searchLocation(query);
        if (!found) {
            trailList.innerHTML = '<div class="trail-item">Location not found</div>';
        }
    }
});

searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            const found = await searchLocation(query);
            if (!found) {
                trailList.innerHTML = '<div class="trail-item">Location not found</div>';
            }
        }
    }
});

// Function to fetch mountain biking trails
async function fetchMTBTrails() {
    try {
        // Clear existing trails
        trailLayer.clearLayers();
        
        const center = map.getCenter();
        
        // Create or update search radius
        if (!searchRadius) {
            createSearchRadius(center);
        }
        
        // Query for mountain biking trails with mtb:scale values
        const query = `
            [out:json][timeout:25];
            (
                way["mtb:scale"](around:${SEARCH_RADIUS},${center.lat},${center.lng});
                relation["mtb:scale"](around:${SEARCH_RADIUS},${center.lat},${center.lng});
            );
            out body;
            >;
            out skel qt;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
        
        if (!data || !data.elements) {
            throw new Error('Invalid response format');
        }
        
        // Clear trail list
        trailList.innerHTML = '';
        
        // Sort trails by difficulty
        const trails = data.elements
            .filter(element => {
                // Check if element has required properties and valid nodes
                return element.type === 'way' && 
                       element.nodes && 
                       element.nodes.length > 0 &&
                       element.tags &&
                       element.tags['mtb:scale'] !== undefined;
            })
            .sort((a, b) => {
                const diffA = parseInt(a.tags['mtb:scale']) || 0;
                const diffB = parseInt(b.tags['mtb:scale']) || 0;
                return diffA - diffB;
            });
        
        if (trails.length === 0) {
            trailList.innerHTML = '<div class="trail-item">No trails found in this area</div>';
            return;
        }
        
        trails.forEach(element => {
            // Validate nodes before mapping
            const validNodes = element.nodes
                .map(nodeId => data.elements.find(e => e.type === 'node' && e.id === nodeId))
                .filter(node => node && node.lat !== undefined && node.lon !== undefined);

            if (validNodes.length < 2) {
                return; // Skip trails with insufficient valid nodes
            }

            const coordinates = validNodes.map(node => [node.lat, node.lon]);

            // Get difficulty color based on mtb:scale
            const difficulty = parseInt(element.tags['mtb:scale']) || 0;
            const color = getDifficultyColor(difficulty);

            // Create a polyline for the trail
            const polyline = L.polyline(coordinates, {
                color: color,
                weight: 4,
                opacity: 0.7,
                interactive: true,
                className: 'trail-path'
            }).addTo(trailLayer);

            // Add click handler for highlighting
            polyline.on('click', function(e) {
                const currentWeight = e.target.options.weight;
                if (currentWeight === 4) {
                    e.target.setStyle({
                        weight: 8,
                        color: color,
                        opacity: 1.0
                    });
                    
                    if (!L.Browser.ie && !L.Browser.opera) {
                        e.target.bringToFront();
                    }
                } else {
                    e.target.setStyle({
                        weight: 4,
                        opacity: 0.7
                    });
                }
            });

            // Create trail list item with safe property access
            const trailItem = document.createElement('div');
            trailItem.className = 'trail-item';
            trailItem.innerHTML = `
                <div class="trail-name">${(element.tags && element.tags.name) || 'Unnamed Trail'}</div>
                <div class="trail-details">
                    Difficulty: ${difficulty}/6<br>
                    Surface: ${(element.tags && element.tags.surface) || 'Unknown'}<br>
                    Length: ${(element.tags && element.tags.length) ? (element.tags.length / 1000).toFixed(2) + 'km' : 'Unknown'}
                </div>
            `;

            // Add click handlers
            trailItem.addEventListener('click', () => {
                polyline.openPopup();
                map.setView(polyline.getBounds().getCenter(), 15);
                // Trigger the highlight effect
                polyline.fire('click');
            });

            polyline.bindPopup(`
                <strong>${(element.tags && element.tags.name) || 'Unnamed Trail'}</strong><br>
                Difficulty: ${difficulty}/6<br>
                Surface: ${(element.tags && element.tags.surface) || 'Unknown'}<br>
                Length: ${(element.tags && element.tags.length) ? (element.tags.length / 1000).toFixed(2) + 'km' : 'Unknown'}
            `);

            trailList.appendChild(trailItem);
        });
        
    } catch (error) {
        console.error('Error fetching trails:', error);
        trailList.innerHTML = `<div class="trail-item">Error: ${error.message}</div>`;
    }
}

// Function to get color based on difficulty
function getDifficultyColor(difficulty) {
    const colors = {
        0: '#00ff00', // Green - Easy
        1: '#ffff00', // Yellow - Moderate
        2: '#ffa500', // Orange - Difficult
        3: '#ff4500', // Orange-Red - Very Difficult
        4: '#ff0000', // Red - Extremely Difficult
        5: '#800000', // Maroon - Expert
        6: '#000000'  // Black - Pro
    };
    return colors[difficulty] || '#808080'; // Gray for unknown
}

// Create search button
const searchButton = L.control({position: 'topright'});
searchButton.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    const button = L.DomUtil.create('a', '', div);
    button.innerHTML = '🚵‍♂️';
    button.style.padding = '6px 10px';
    button.style.cursor = 'pointer';
    button.title = 'Search MTB Trails';
    
    L.DomEvent.on(button, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        fetchMTBTrails();
        sidePanel.style.display = 'flex';
    });
    
    return div;
};
searchButton.addTo(map);

// Create 3D toggle button
const toggle3DButton = L.control({position: 'topright'});
toggle3DButton.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-3d');
    const button = L.DomUtil.create('a', '', div);
    button.innerHTML = '🌍';
    button.style.padding = '6px 10px';
    button.style.cursor = 'pointer';
    button.title = 'Toggle 3D View';
    
    let is3D = false;
    
    L.DomEvent.on(button, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        is3D = !is3D;
        if (is3D) {
            map.removeLayer(aerialLayer);
            map.addLayer(aerialLayer);
            button.innerHTML = '🗺️';
        } else {
            map.removeLayer(aerialLayer);
            button.innerHTML = '🌍';
        }
    });
    
    return div;
};
toggle3DButton.addTo(map);

// Create initial search radius
createSearchRadius(map.getCenter());

// Keep radius circle centered on map
map.on('move', updateRadiusPosition);

function createTrail(trail) {
    const polyline = L.polyline(trail.coordinates, {
        color: trail.color || '#00ff00',
        weight: 4,
        opacity: 0.6
    });

    // Add invisible wider line for easier clicking
    const clickPolyline = L.polyline(trail.coordinates, {
        color: trail.color || '#00ff00',
        weight: 20,
        opacity: 0,
        interactive: true
    });

    // Add visible trail on top
    const visibleTrail = L.polyline(trail.coordinates, {
        color: trail.color || '#00ff00',
        weight: 4,
        opacity: 0.6,
        interactive: false
    });

}