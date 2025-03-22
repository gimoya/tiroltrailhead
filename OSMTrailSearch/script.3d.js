class TerrainMap {
    constructor() {
        this.centerLat = 47.2692;
        this.centerLng = 11.3927;
        this.zoom = 10;
        this.pitch = 60;
        this.bearing = 30;
        this.heightScale = 1.5;  // Fixed value
        this.is3D = true;
        this.SEARCH_RADIUS = 5000; // 5km in meters
        this.BUFFER_COUNT = 5;
        
        mapboxgl.accessToken = 'pk.eyJ1IjoiZ2ltb3lhIiwiYSI6IkZrTld6NmcifQ.eY6Ymt2kVLvPQ6A2Dt9zAQ';
        this.init();
        this.initSidePanel();
    }

    init() {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-v9',
            center: [this.centerLng, this.centerLat],
            zoom: this.zoom,
            pitch: this.pitch,
            bearing: this.bearing,
            antialias: true
        });

        this.map.on('load', () => {
            // Add terrain source with latest DEM tileset
            this.map.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.terrain-rgb',
                'tileSize': 256,
                'maxzoom': 15
            });

            // Add terrain layer with higher exaggeration
            this.map.setTerrain({
                'source': 'mapbox-dem',
                'exaggeration': 1.5  // Fixed value
            });

            // Add sky layer
            this.map.addLayer({
                'id': 'sky',
                'type': 'sky',
                'paint': {
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 90.0],
                    'sky-atmosphere-sun-intensity': 15
                }
            });

            // Add source for search radius
            this.map.addSource('search-area', {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': []
                }
            });

            // Add layers for search radius visualization
            this.addSearchRadiusLayers();

            // Add source for trails
            this.map.addSource('trails', {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': []
                }
            });

            // Add trail layer
            this.map.addLayer({
                'id': 'trails',
                'type': 'line',
                'source': 'trails',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': ['get', 'color'],
                    'line-width': ['case',
                        ['boolean', ['get', 'highlighted'], false],
                        8,
                        4
                    ],
                    'line-opacity': ['case',
                        ['boolean', ['get', 'highlighted'], false],
                        1,
                        0.7
                    ]
                }
            });

            // Add trails buffer layer
            this.map.addLayer({
                'id': 'trails-buffer',
                'type': 'line',
                'source': 'trails',
                'paint': {
                    'line-width': 30,
                    'line-opacity': 0.15
                }
            });

            // Hide loading message
            document.querySelector('.loading').style.display = 'none';

            // Add custom controls container
            this.addControlsContainer();
            
            // Create navigation control with all options enabled initially
            this.navControl = new mapboxgl.NavigationControl({
                showCompass: true,
                showZoom: true,
                visualizePitch: true
            });
            
            // Add navigation control to our custom container
            document.querySelector('.mapboxgl-ctrl-group.controls-container')
                .appendChild(this.navControl.onAdd(this.map));
            
            // Add view toggle after navigation controls
            this.addViewToggle();
            this.addSearchButton();

            // Add click handler for trails
            this.map.on('click', 'trails-buffer', (e) => {
                const features = this.map.queryRenderedFeatures(e.point, {
                    layers: ['trails-buffer'],
                    radius: 10  // Increased click radius for better sensitivity
                });
                
                if (!features.length) return;

                const feature = features[0];
                feature.properties.highlighted = !feature.properties.highlighted;
                
                // Update the feature in the source
                const data = this.map.getSource('trails')._data;
                const index = data.features.findIndex(f => f.id === feature.id);
                if (index !== -1) {
                    data.features[index] = feature;
                    this.map.getSource('trails').setData(data);
                }

                // Show popup
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
                        <div class="popup-content">
                            <div class="popup-title">${feature.properties.name}</div>
                            <div class="popup-details">
                                Difficulty: ${feature.properties.difficulty}/6<br>
                                Surface: ${feature.properties.surface}<br>
                                Length: ${feature.properties.length}
                            </div>
                        </div>
                    `)
                    .addTo(this.map);
            });

            // Also add hover state for better UX
            this.map.on('mouseenter', 'trails-buffer', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });

            this.map.on('mouseleave', 'trails-buffer', () => {
                this.map.getCanvas().style.cursor = '';
            });
        });

        // Update search radius on map move
        this.map.on('moveend', () => this.updateSearchRadius());
    }

    initSidePanel() {
        const sidePanel = document.createElement('div');
        sidePanel.className = 'side-panel';
        sidePanel.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">OSM MTB Trail Search</div>
                <div class="toggle-button">×</div>
            </div>
            <div class="search-container">
                <input type="text" class="search-input" placeholder="Search location...">
            </div>
            <div class="trail-list"></div>
        `;
        document.body.appendChild(sidePanel);

        const toggleButton = sidePanel.querySelector('.toggle-button');
        toggleButton.addEventListener('click', () => {
            if (sidePanel.style.display === 'none') {
                sidePanel.style.display = 'flex';
            } else {
                sidePanel.style.display = 'none';
                sidePanel.querySelector('.trail-list').innerHTML = '';
            }
        });

        // Add search input handler
        const searchInput = sidePanel.querySelector('.search-input');
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    await this.searchLocation(query);
                }
            }
        });
    }

    addControlsContainer() {
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl-group controls-container';
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.getElementById('map').appendChild(container);
    }

    addViewToggle() {
        const button = document.createElement('button');
        button.className = 'mapboxgl-ctrl-icon view-toggle';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.cursor = 'pointer';
        button.style.border = 'none';
        button.style.padding = '0';
        button.style.backgroundColor = '#fff';
        button.style.borderBottom = '1px solid #ddd';

        // Add Font Awesome icon
        const icon = document.createElement('i');
        icon.className = 'fas fa-cube'; // 3D cube icon
        button.appendChild(icon);

        button.addEventListener('click', () => {
            this.toggleView();
            icon.className = this.is3D ? 'fas fa-cube' : 'fas fa-map'; // Toggle between 3D cube and 2D map icons
        });

        // Add tooltip
        button.title = 'Toggle 2D/3D View';

        // Add to the controls container
        document.querySelector('.mapboxgl-ctrl-group.controls-container').appendChild(button);
    }

    toggleView() {
        this.is3D = !this.is3D;
        
        if (this.is3D) {
            // Switch to 3D view
            this.map.easeTo({
                pitch: 60,
                bearing: 30,
                duration: 1000
            });
            
            this.map.setTerrain({
                'source': 'mapbox-dem',
                'exaggeration': 1.5
            });
            
            // Show sky layer
            this.map.setLayoutProperty('sky', 'visibility', 'visible');
            
            // Enable rotation and pitch
            this.map.dragRotate.enable();
            this.map.touchZoomRotate.enableRotation();
            this.map.keyboard.enable();
            
            // Update navigation control to show all controls
            this.updateNavigationControl(true);
            
        } else {
            // Switch to 2D view
            this.map.easeTo({
                pitch: 0,
                bearing: 0,
                duration: 1000
            });
            
            // Remove terrain
            this.map.setTerrain(null);
            
            // Hide sky layer
            this.map.setLayoutProperty('sky', 'visibility', 'none');
            
            // Disable rotation and pitch
            this.map.dragRotate.disable();
            this.map.touchZoomRotate.disableRotation();
            this.map.keyboard.disable();
            
            // Update navigation control to show only zoom controls
            this.updateNavigationControl(false);
        }
    }

    updateNavigationControl(show3DControls) {
        // Remove existing control
        if (this.navControl) {
            this.navControl.onRemove();
        }

        // Create new control with appropriate options
        this.navControl = new mapboxgl.NavigationControl({
            showCompass: show3DControls,
            showZoom: true,
            visualizePitch: show3DControls
        });

        // Add the new control
        document.querySelector('.mapboxgl-ctrl-group.controls-container')
            .appendChild(this.navControl.onAdd(this.map));
    }

    addSearchButton() {
        const button = document.createElement('button');
        button.className = 'mapboxgl-ctrl-icon search-button';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.cursor = 'pointer';
        button.style.border = 'none';
        button.style.padding = '0';
        button.style.backgroundColor = '#fff';

        const icon = document.createElement('i');
        icon.className = 'fas fa-bicycle';
        button.appendChild(icon);

        button.addEventListener('click', () => this.fetchMTBTrails());
        button.title = 'Search MTB Trails';

        document.querySelector('.mapboxgl-ctrl-group.controls-container').appendChild(button);
    }

    addSearchRadiusLayers() {
        // Buffer circles first (from outer to inner)
        for (let i = this.BUFFER_COUNT; i >= 0; i--) {
            this.map.addLayer({
                'id': `search-radius-buffer-${i}`,
                'type': 'line',
                'source': 'search-area',
                'filter': ['==', 'buffer', i],
                'paint': {
                    'line-color': 'white',
                    'line-width': i === 0 ? 3 : (this.BUFFER_COUNT - i + 1),
                    'line-opacity': i === 0 ? 0.9 : 0.5
                }
            });
        }
    }

    updateSearchRadius() {
        const center = this.map.getCenter();
        const features = [];

        // Main search radius circle
        features.push(this.createCircleFeature(center, this.SEARCH_RADIUS, 0));

        // Buffer circles
        for (let i = 1; i <= this.BUFFER_COUNT; i++) {
            const radius = this.SEARCH_RADIUS * (1 + (i * 0.5));
            features.push(this.createCircleFeature(center, radius, i));
        }

        this.map.getSource('search-area').setData({
            type: 'FeatureCollection',
            features: features
        });
    }

    createCircleFeature(center, radius, buffer) {
        const points = 64;
        const coords = [];
        
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const lat = center.lat + (radius / 111320) * Math.cos(angle);
            const lng = center.lng + (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
            coords.push([lng, lat]);
        }

        return {
            type: 'Feature',
            properties: { buffer: buffer },
            geometry: {
                type: 'Polygon',
                coordinates: [coords]
            }
        };
    }

    async searchLocation(query) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const location = data[0];
                this.map.flyTo({
                    center: [parseFloat(location.lon), parseFloat(location.lat)],
                    zoom: 13,
                    duration: 2000
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error searching location:', error);
            return false;
        }
    }

    getDifficultyColor(difficulty, type = 'mtb') {
        const mtbColors = {
            0: '#4169E1',  // Royal Blue - Easy
            1: '#6495ED',  // Cornflower Blue - Easy/Intermediate
            2: '#9370DB',  // Medium Purple - Intermediate
            3: '#DA70D6',  // Orchid - Intermediate/Difficult
            4: '#FF1493',  // Deep Pink - Difficult
            5: '#DC143C',  // Crimson - Very Difficult
            6: '#8B0000'   // Dark Red - Extremely Difficult
        };

        const sacColors = {
            'hiking': '#90EE90',                    // Light Green - T1
            'mountain_hiking': '#9ACD32',           // Yellow Green - T2
            'demanding_mountain_hiking': '#DAA520',  // Goldenrod - T3
            'alpine_hiking': '#CD853F',             // Peru - T4
            'demanding_alpine_hiking': '#8B4513',    // Saddle Brown - T5
            'difficult_alpine_hiking': '#654321'     // Dark Brown - T6
        };

        return type === 'mtb' ? 
            (mtbColors[difficulty] || mtbColors[0]) : 
            (sacColors[difficulty] || sacColors['hiking']);
    }

    async fetchMTBTrails() {
        try {
            const center = this.map.getCenter();
            
            // Clear existing trails
            this.map.getSource('trails').setData({
                type: 'FeatureCollection',
                features: []
            });
            document.querySelector('.trail-list').innerHTML = '';
            
            // Update search radius visualization
            this.updateSearchRadius();
            
            // Show side panel
            document.querySelector('.side-panel').style.display = 'flex';
            
            // Query for mountain biking trails and SAC hiking trails
            const query = `
                [out:json][timeout:25];
                (
                    way["mtb:scale"](around:${this.SEARCH_RADIUS},${center.lat},${center.lng});
                    relation["mtb:scale"](around:${this.SEARCH_RADIUS},${center.lat},${center.lng});
                    way["sac_scale"](around:${this.SEARCH_RADIUS},${center.lat},${center.lng});
                    relation["sac_scale"](around:${this.SEARCH_RADIUS},${center.lat},${center.lng});
                );
                out body;
                >;
                out skel qt;
            `;

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (!data || !data.elements) throw new Error('Invalid response format');

            // Process trails
            const trails = data.elements.filter(e => e.type === 'way' && e.tags && (e.tags['mtb:scale'] || e.tags['sac_scale']));
            const trailFeatures = [];

            trails.forEach((trail, index) => {
                const nodes = trail.nodes
                    .map(nodeId => data.elements.find(e => e.type === 'node' && e.id === nodeId))
                    .filter(node => node && node.lat !== undefined && node.lon !== undefined);

                if (nodes.length < 2) return;

                const coordinates = nodes.map(node => [node.lon, node.lat]);
                const isMTB = !!trail.tags['mtb:scale'];
                const difficulty = isMTB ? 
                    parseInt(trail.tags['mtb:scale']) || 0 :
                    trail.tags['sac_scale'];
                const color = this.getDifficultyColor(difficulty, isMTB ? 'mtb' : 'sac');

                const feature = {
                    type: 'Feature',
                    id: index,
                    properties: {
                        name: trail.tags.name || 'Unnamed Trail',
                        difficulty: difficulty,
                        type: isMTB ? 'MTB' : 'Hiking',
                        surface: trail.tags.surface || 'Unknown',
                        length: turf.length({
                            type: 'LineString',
                            coordinates: coordinates
                        }).toFixed(2) + ' km',
                        color: color,
                        highlighted: false
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates
                    }
                };

                trailFeatures.push(feature);
                this.addTrailListItem(feature);
            });

            // Update trails source
            this.map.getSource('trails').setData({
                type: 'FeatureCollection',
                features: trailFeatures
            });

        } catch (error) {
            console.error('Error fetching trails:', error);
            document.querySelector('.trail-list').innerHTML = `<div class="trail-item">Error: ${error.message}</div>`;
        }
    }

    addTrailListItem(trail) {
        const trailList = document.querySelector('.trail-list');
        const item = document.createElement('div');
        item.className = 'trail-item';
        
        const difficultyColor = trail.properties.color;
        const difficultyText = trail.properties.type === 'MTB' ? 
            `MTB Level ${trail.properties.difficulty}/6` :
            `SAC ${trail.properties.difficulty.replace(/_/g, ' ').toUpperCase()}`;

        item.innerHTML = `
            <div class="difficulty-badge" style="background-color: ${difficultyColor}">
                ${difficultyText}
            </div>
            <div class="trail-name">${trail.properties.name}</div>
            <div class="trail-details">
                Type: ${trail.properties.type}<br>
                Surface: ${trail.properties.surface}<br>
                Length: ${trail.properties.length}
            </div>
        `;

        item.addEventListener('click', () => {
            // Center map on trail
            const bounds = new mapboxgl.LngLatBounds();
            trail.geometry.coordinates.forEach(coord => bounds.extend(coord));
            this.map.fitBounds(bounds, { padding: 50 });

            // Highlight trail
            const data = this.map.getSource('trails')._data;
            data.features.forEach(f => {
                if (f.id === trail.id) {
                    f.properties.highlighted = true;
                    // Show popup
                    new mapboxgl.Popup()
                        .setLngLat(trail.geometry.coordinates[0])
                        .setHTML(`
                            <div class="popup-content">
                                <div class="popup-title">${trail.properties.name}</div>
                                <div class="popup-details">
                                    ${difficultyText}<br>
                                    Surface: ${trail.properties.surface}<br>
                                    Length: ${trail.properties.length}
                                </div>
                            </div>
                        `)
                        .addTo(this.map);
                } else {
                    f.properties.highlighted = false;
                }
            });
            this.map.getSource('trails').setData(data);
        });

        trailList.appendChild(item);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TerrainMap();
}); 