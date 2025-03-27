class TerrainMap {
    constructor() {
        this.centerLat = 49.073;
        this.centerLng = 13.098;
        this.zoom = 10;
        this.pitch = 60;
        this.bearing = 30;
        this.heightScale = 1.5;
        this.is3D = true;
        this.hoveredTrailId = null;
        this.selectedTrail = null;
        this.currentPopup = null;     
        mapboxgl.accessToken = 'pk.eyJ1IjoiZ2ltb3lhIiwiYSI6IkZrTld6NmcifQ.eY6Ymt2kVLvPQ6A2Dt9zAQ';
        this.init();
    }

    init() {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [this.centerLng, this.centerLat],
            zoom: this.zoom,
            pitch: this.pitch,
            bearing: this.bearing,
            antialias: true
        });

        this.map.on('load', () => {
            // Add terrain source
            this.map.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.terrain-rgb',
                'tileSize': 256,
                'maxzoom': 15
            });

            // Add terrain layer
            this.map.setTerrain({
                'source': 'mapbox-dem',
                'exaggeration': this.heightScale
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

            // Load and add trail_park_data
            this.loadKML();

            // Hide loading message
            document.querySelector('.loading').style.display = 'none';

            // Add controls container
            this.addControlsContainer();
            
            // Add navigation control
            this.navControl = new mapboxgl.NavigationControl({
                showCompass: true,
                showZoom: true,
                visualizePitch: true
            });
            
            document.querySelector('.nav-control-wrapper')
                .appendChild(this.navControl.onAdd(this.map));
            
            // Add view toggle
            this.addViewToggle();

            // Add click handler for map
            this.map.on('click', (e) => {
                // Check if click is on a trail
                const features = this.map.queryRenderedFeatures(e.point, { layers: ['trail_park_data'] });
                if (!features.length) {
                    // If click is not on a trail, remove popup
                    if (this.currentPopup) {
                        this.currentPopup.remove();
                        this.currentPopup = null;
                    }
                }
            });
        });
    }

    async loadKML() {
        try {
            const response = await fetch('bodensee_trail_park.kml');
            const text = await response.text();
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(text, 'text/xml');
            
            // Convert KML to GeoJSON
            const trailData = {
                type: 'FeatureCollection',
                features: []
            };

            // Process all Placemarks
            const placemarks = kmlDoc.getElementsByTagName('Placemark');
            for (const placemark of placemarks) {
                const name = placemark.getElementsByTagName('name')[0]?.textContent || '';
                const styleUrl = placemark.getElementsByTagName('styleUrl')[0]?.textContent || '';
                
                // Get coordinates based on geometry type
                let coordinates;
                let geometryType;
                
                // Check for LineString
                const lineString = placemark.getElementsByTagName('LineString')[0];
                if (lineString) {
                    geometryType = 'LineString';
                    const coordsText = lineString.getElementsByTagName('coordinates')[0]?.textContent || '';
                    coordinates = coordsText.trim().split(' ').map(coord => {
                        const [lng, lat] = coord.split(',').map(Number);
                        return [lng, lat];
                    });
                }
                
                // Check for Polygon
                const polygon = placemark.getElementsByTagName('Polygon')[0];
                if (polygon) {
                    geometryType = 'Polygon';
                    const coordsText = polygon.getElementsByTagName('coordinates')[0]?.textContent || '';
                    coordinates = [coordsText.trim().split(' ').map(coord => {
                        const [lng, lat] = coord.split(',').map(Number);
                        return [lng, lat];
                    })];
                }
                
                // Check for Point
                const point = placemark.getElementsByTagName('Point')[0];
                if (point) {
                    geometryType = 'Point';
                    const coordsText = point.getElementsByTagName('coordinates')[0]?.textContent || '';
                    const [lng, lat] = coordsText.split(',').map(Number);
                    coordinates = [lng, lat];
                }

                if (coordinates) {
                    trailData.features.push({
                        type: 'Feature',
                        geometry: {
                            type: geometryType,
                            coordinates: coordinates
                        },
                        properties: {
                            name: name,
                            styleUrl: styleUrl,
                            visible: true,
                            highlighted: false
                        }
                    });
                }
            }

            // Add IDs to features if they don't exist
            trailData.features = trailData.features.map((feature, index) => ({
                ...feature,
                id: index // Add numeric ID to each feature
            }));

            // Add source for trail_park_data
            this.map.addSource('trail_park_data', {
                'type': 'geojson',
                'data': trailData,
                'generateId': false // We manually set IDs above
            });

            // Add interactive trail layer (bottom layer)
            this.map.addLayer({
                'id': 'trail_park_data',
                'type': 'line',
                'source': 'trail_park_data',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': 'black',
                    'line-width': [
                        'case',
                        ['boolean', ['get', 'highlighted'], false],
                        20,
                        ['case',
                            ['boolean', ['feature-state', 'hover'], false],
                            20,
                            15
                        ]
                    ],
                    'line-opacity': [
                        'case',
                        ['boolean', ['get', 'highlighted'], false],
                        0.5,
                        ['case',
                            ['boolean', ['feature-state', 'hover'], false],
                            0.5,
                            ['case',
                                ['boolean', ['get', 'visible'], false],
                                0.3,
                                0
                            ]
                        ]
                    ]
                }
            });

            // Add background trail layer (top layer)
            this.map.addLayer({
                'id': 'trail_park_data-symbol',
                'type': 'line',
                'source': 'trail_park_data',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#FF5F1F',
                    'line-width': 3.6,
                    'line-opacity': [
                        'case',
                        ['boolean', ['get', 'visible'], false],
                        0.85,
                        0
                    ]
                }
            });

            // Add hover effect
            this.map.on('mousemove', 'trail_park_data', (e) => {
                if (e.features.length > 0) {
                    if (this.hoveredTrailId !== null) {
                        this.map.setFeatureState(
                            { source: 'trail_park_data', id: this.hoveredTrailId },
                            { hover: false }
                        );
                    }
                    
                    this.hoveredTrailId = e.features[0].id;
                    
                    this.map.setFeatureState(
                        { source: 'trail_park_data', id: this.hoveredTrailId },
                        { hover: true }
                    );
                    
                    this.map.getCanvas().style.cursor = 'pointer';
                }
            });

            this.map.on('mouseleave', 'trail_park_data', () => {
                if (this.hoveredTrailId !== null) {
                    this.map.setFeatureState(
                        { source: 'trail_park_data', id: this.hoveredTrailId },
                        { hover: false }
                    );
                }
                this.hoveredTrailId = null;
                this.map.getCanvas().style.cursor = '';
            });

            // Click handler for trail_park_data
            this.map.on('click', 'trail_park_data', (e) => {
                if (e.features.length > 0) {
                    // Remove existing popup if any
                    if (this.currentPopup) {
                        this.currentPopup.remove();
                    }

                    const feature = e.features[0];
                
                    // Update the feature in the source
                    const data = this.map.getSource('trail_park_data')._data;
                    data.features.forEach(f => {
                        f.properties.highlighted = f.id === feature.id;
                    });
                    this.map.getSource('trail_park_data').setData(data);

                    // Fit bounds to the clicked trail
                    const coordinates = feature.geometry.coordinates;
                    const bounds = coordinates.reduce((bounds, coord) => {
                        return bounds.extend(coord);
                    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

                    this.map.fitBounds(bounds, {
                        padding: 50
                    });

                    // Show popup with proper accessibility
                    this.currentPopup = new mapboxgl.Popup({
                        closeButton: true,
                        closeOnClick: false,
                        className: 'accessible-popup'
                    })
                        .setLngLat(e.lngLat)
                        .setHTML(`
                            <div class="pop_cont_name">${(feature.properties.name)}</div>
                        `)
                        .addTo(this.map);

                    // Fix accessibility of close button after popup is added
                    const closeButton = this.currentPopup.getElement().querySelector('.mapboxgl-popup-close-button');
                    if (closeButton) {
                        closeButton.removeAttribute('aria-hidden');
                        closeButton.setAttribute('aria-label', 'Close trail information');
                    }
                }
            });

        } catch (error) {
            console.error('Error loading KML:', error);
        }
    }

    addControlsContainer() {
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl-group controls-container';
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0'; // Remove gap as controls should be flush
        document.getElementById('map').appendChild(container);

        // Create a single control group div to maintain consistent styling
        const controlGroup = document.createElement('div');
        controlGroup.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        container.appendChild(controlGroup);

        // Add view toggle first to maintain order
        const toggleButton = this.createViewToggleButton();
        controlGroup.appendChild(toggleButton);

        // Add wrapper for nav control to maintain consistent structure
        const navWrapper = document.createElement('div');
        navWrapper.className = 'nav-control-wrapper';
        controlGroup.appendChild(navWrapper);
    }

    createViewToggleButton() {
        const button = document.createElement('button');
        button.className = 'mapboxgl-ctrl-icon view-toggle';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.cursor = 'pointer';
        button.style.padding = '0';
        button.style.border = 'none';
        button.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)'; // Consistent with Mapbox controls

        const icon = document.createElement('i');
        icon.className = 'fas fa-cube';
        button.appendChild(icon);

        button.addEventListener('click', () => {
            this.toggleView();
            icon.className = this.is3D ? 'fas fa-cube' : 'fas fa-map';
        });

        button.title = 'Toggle 2D/3D View';
        return button;
    }

    addViewToggle() {
        // This method is now just a placeholder as the toggle is created in addControlsContainer
        // We keep it for potential future modifications
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
                'exaggeration': this.heightScale
            });
            
            this.map.setLayoutProperty('sky', 'visibility', 'visible');
            
            // Enable rotation and pitch
            this.map.dragRotate.enable();
            this.map.touchZoomRotate.enableRotation();
            this.map.keyboard.enable();
            
            this.updateNavigationControl(true);
            
        } else {
            // Switch to 2D view
            this.map.easeTo({
                pitch: 0,
                bearing: 0,
                duration: 1000
            });
            
            this.map.setTerrain(null);
            this.map.setLayoutProperty('sky', 'visibility', 'none');
            
            // Disable rotation and pitch
            this.map.dragRotate.disable();
            this.map.touchZoomRotate.disableRotation();
            this.map.keyboard.disable();
            
            this.updateNavigationControl(false);
        }
    }

    updateNavigationControl(show3DControls) {
        if (this.navControl) {
            this.navControl.onRemove();
        }

        this.navControl = new mapboxgl.NavigationControl({
            showCompass: show3DControls,
            showZoom: true,
            visualizePitch: show3DControls
        });

        document.querySelector('.nav-control-wrapper')
            .appendChild(this.navControl.onAdd(this.map));
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TerrainMap();
}); 