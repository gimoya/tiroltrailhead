class TerrainMap {
    constructor() {
        this.centerLat = 47.2692;
        this.centerLng = 11.3927;
        this.zoom = 10;
        this.pitch = 60;
        this.bearing = 30;
        this.heightScale = 1.5;
        this.is3D = true;
        this.hoveredTrailId = null;
        this.selectedTrail = null;
        this.currentPopup = null;
        this.filters = {
            tech: new Set(),
            flow: new Set(),
            trailfeatures: new Set(),
            exposure: new Set(),
            wanderer: new Set(),
            status: new Set()
        };
        
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

            // Load and add trails
            this.loadTrails();

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

            // Setup Ko-fi functionality
            this.setupKofi();

            // Add click handler for map
            this.map.on('click', (e) => {
                // Check if click is on a trail
                const features = this.map.queryRenderedFeatures(e.point, { layers: ['trails'] });
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

    async loadTrails() {
        try {
            const response = await fetch('my_trails_z.geojson');
            const trailData = await response.json();
            
            // Add IDs to features if they don't exist
            trailData.features = trailData.features.map((feature, index) => ({
                ...feature,
                id: index // Add numeric ID to each feature
            }));

            // Add source for trails
            this.map.addSource('trails', {
                'type': 'geojson',
                'data': trailData,
                'generateId': false // We manually set IDs above
            });

            // Add interactive trail layer (bottom layer)
            this.map.addLayer({
                'id': 'trails',
                'type': 'line',
                'source': 'trails',
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
                'id': 'trails-symbol',
                'type': 'line',
                'source': 'trails',
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
            this.map.on('mousemove', 'trails', (e) => {
                if (e.features.length > 0) {
                    if (this.hoveredTrailId !== null) {
                        this.map.setFeatureState(
                            { source: 'trails', id: this.hoveredTrailId },
                            { hover: false }
                        );
                    }
                    
                    this.hoveredTrailId = e.features[0].id;
                    
                    this.map.setFeatureState(
                        { source: 'trails', id: this.hoveredTrailId },
                        { hover: true }
                    );
                    
                    this.map.getCanvas().style.cursor = 'pointer';
                }
            });

            this.map.on('mouseleave', 'trails', () => {
                if (this.hoveredTrailId !== null) {
                    this.map.setFeatureState(
                        { source: 'trails', id: this.hoveredTrailId },
                        { hover: false }
                    );
                }
                this.hoveredTrailId = null;
                this.map.getCanvas().style.cursor = '';
            });

            // Click handler for trails
            this.map.on('click', 'trails', (e) => {
                if (e.features.length > 0) {
                    // Remove existing popup if any
                    if (this.currentPopup) {
                        this.currentPopup.remove();
                    }

                    const feature = e.features[0];
                
                // Update the feature in the source
                const data = this.map.getSource('trails')._data;
                    data.features.forEach(f => {
                        f.properties.highlighted = f.id === feature.id;
                    });
                    this.map.getSource('trails').setData(data);

                    // Fit bounds to the clicked trail
                    const coordinates = feature.geometry.coordinates;
                    const bounds = coordinates.reduce((bounds, coord) => {
                        return bounds.extend(coord);
                    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

                    this.map.fitBounds(bounds, {
                        padding: 50
                    });

                    // Create GPX download link
                    const gpxOptions = {
                        creator: 'TirolTrailhead',
                        featureTitle: (properties) => properties.name || 'Trail',
                        featureDescription: (properties) => properties.description || ''
                    };
                    const gpxBlob = new Blob([togpx(feature, gpxOptions)], {type: 'application/gpx+xml'});
                    const gpxUrl = window.URL.createObjectURL(gpxBlob);
                    const gpxFilename = `${feature.properties.name || 'trail'}.gpx`;

                    // Show popup with proper accessibility
                    this.currentPopup = new mapboxgl.Popup({
                        closeButton: true,
                        closeOnClick: false,
                        className: 'accessible-popup'
                    })
                        .setLngLat(e.lngLat)
                        .setHTML(`
                            <p><div class="pop_cont_name">${(feature.properties.name || 'Unnamed Trail').replace(/\s+\(\d+\)$/, '')}</div></p>
                            <div class="pop_cont_text">${feature.properties.Trail_Text || ''}</div>
                            <div class="pop_gpx_text" 
                                 role="button" 
                                 tabindex="0" 
                                 onclick="downloadGPX('${gpxUrl}', '${gpxFilename}'); showKofiReminder();"
                                 onkeypress="(e) => { if (e.key === 'Enter') { downloadGPX('${gpxUrl}', '${gpxFilename}'); showKofiReminder(); } }"
                                 aria-label="Download GPX Track and support on Ko-fi">
                                🤝 Download GPX Track 🚩
                            </div>
                            <div class="kofi_reminder_gpx">
                                <p>🚴 Dein GPX-Track wird heruntergeladen..</p>
                                <p>💲 Die Downloads auf dieser Seite sind gratis, aber der Betrieb dieser <strong>Webseite kostet Geld!</strong></p>
                                <p>🤝 Für den GPX-Download kannst Du dich <strong>mit einem freien Beitrag</strong> erkenntlich zeigen!</p>
                                <p>💓 Bitte hilf mit, das Projekt am Leben zu halten!</p>
                                <div class="kofi_button_gpx">
                                    <a href="https://ko-fi.com/C1C74GQ0I" target="_blank"><img id="kofi_img_gpx" class="kofi_img" src="https://tiroltrailhead.com/legacy_trails/images/kofi_s_logo_nolabel.png"><button type="button">Dein Support!👋</button></a>
                                </div>
                            </div>
                        `)
                        .addTo(this.map);

                    // Add Ko-fi image click handler after popup is added
                    const kofiImg = this.currentPopup.getElement().querySelector('#kofi_img_gpx');
                    if (kofiImg) {
                        kofiImg.addEventListener('click', () => {
                            window.open('https://ko-fi.com/tiroltrailhead', '_blank');
                        });
                    }

                    // Fix accessibility of close button after popup is added
                    const closeButton = this.currentPopup.getElement().querySelector('.mapboxgl-popup-close-button');
                    if (closeButton) {
                        closeButton.removeAttribute('aria-hidden');
                        closeButton.setAttribute('aria-label', 'Close trail information');
                    }
                }
            });

            // Setup filter panel after trails are loaded
            this.setupFilterPanel();

        } catch (error) {
            console.error('Error loading trails:', error);
        }
    }

    setupKofi() {
        // Add GPX download function to window scope
        window.downloadGPX = (url, filename) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        };

        // Add show Ko-fi reminder function to window scope
        window.showKofiReminder = () => {
            const reminder = document.querySelector('.kofi_reminder_gpx');
            reminder.classList.add('show');
        };

        // Add close Ko-fi reminder function to window scope
        window.closeKofiReminder = () => {
            const reminder = document.querySelector('.kofi_reminder_gpx');
            reminder.classList.remove('show');
        };
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

    setupFilterPanel() {
        const toggleButton = document.querySelector('.filter-toggle');
        const sidePanel = document.querySelector('.side-panel');
        const trailData = this.map.getSource('trails')._data;

        // Toggle panel visibility
        toggleButton.addEventListener('click', () => {
            sidePanel.classList.toggle('hidden');
            toggleButton.classList.toggle('active');
        });

        // Initialize filters with all available values
        this.filters = {
            tech: new Set(),
            flow: new Set(),
            trailfeatures: new Set(),
            exposure: new Set(),
            wanderer: new Set(),
            status: new Set()
        };

        // Collect all unique values for each filter
        trailData.features.forEach(feature => {
            if (feature.properties.Tech) this.filters.tech.add(feature.properties.Tech);
            if (feature.properties.Flow) this.filters.flow.add(feature.properties.Flow);
            if (feature.properties.Features) this.filters.trailfeatures.add(feature.properties.Features);
            if (feature.properties.Wanderer) this.filters.wanderer.add(feature.properties.Wanderer);
            if (feature.properties.Status) this.filters.status.add(feature.properties.Status);
        });

        // Populate filter options
        this.populateFlowFilters(trailData);
        this.populateTechnicalFilters(trailData);
        this.populateTrailfeaturesFilters(trailData);
        this.populateExposureFilters(trailData); 
        this.populateWandererFilters(trailData);
        this.populateStatusFilters(trailData);

        // Add filter change listeners
        document.querySelectorAll('.filter-option input').forEach(input => {
            input.addEventListener('change', () => this.applyFilters());
        });

        // Call applyFilters after setting up the panel to make trails visible initially
        this.applyFilters();
    }

    populateFlowFilters(trailData) {
        const flowRatings = new Set();
        trailData.features.forEach(feature => {
            if (feature.properties.Flow) {
                flowRatings.add(feature.properties.Flow);
            }
        });

        const container = document.getElementById('flow-filters');
        Array.from(flowRatings).sort().forEach(rating => {
            const option = this.createFilterOption('flow', rating);
            container.appendChild(option);
        });
    }

    populateTechnicalFilters(trailData) {
        const technicalRatings = new Set();
        trailData.features.forEach(feature => {
            if (feature.properties.Tech) {
                technicalRatings.add(feature.properties.Tech);
            }
        });

        const container = document.getElementById('technical-filters');
        Array.from(technicalRatings).sort().forEach(rating => {
            const option = this.createFilterOption('tech', rating);
            container.appendChild(option);
        });
    }

    populateTrailfeaturesFilters(trailData) {
        const featureRatings = new Set();
        trailData.features.forEach(feature => {
            if (feature.properties.Features) {
                featureRatings.add(feature.properties.Features);
            }
        });

        const container = document.getElementById('trailfeatures-filters');
        Array.from(featureRatings).sort().forEach(rating => {
            const option = this.createFilterOption('trailfeatures', rating);
            container.appendChild(option);
        });
    }

    populateExposureFilters(trailData) {
        const exposureRatings = new Set();
        trailData.features.forEach(feature => {
            if (feature.properties.Trail_Text) {
                const exposureMatch = feature.properties.Trail_Text.match(/Exposure:\t([^\n]+)/);
                if (exposureMatch) {
                    exposureRatings.add(exposureMatch[1].trim());
                }
            }
        });

        const container = document.getElementById('exposure-filters');
        Array.from(exposureRatings).sort().forEach(rating => {
            const option = this.createFilterOption('exposure', rating);
            container.appendChild(option);
        });
    }

    populateWandererFilters(trailData) {
        const wandererRatings = new Set();
        trailData.features.forEach(feature => {
            if (feature.properties.Wanderer) {
                wandererRatings.add(feature.properties.Wanderer);
            }
        });

        const container = document.getElementById('wanderer-filters');
        Array.from(wandererRatings).sort().forEach(rating => {
            const option = this.createFilterOption('wanderer', rating);
            container.appendChild(option);
        });
    }

    populateStatusFilters(trailData) {
        const statusRatings = new Set();
        trailData.features.forEach(feature => {
            if (feature.properties.Status) {
                statusRatings.add(feature.properties.Status);
            }
        });

        const container = document.getElementById('status-filters');
        Array.from(statusRatings).sort().forEach(rating => {
            const option = this.createFilterOption('status', rating);
            container.appendChild(option);
        });
    }

    createFilterOption(type, value) {
        const div = document.createElement('div');
        div.className = 'filter-option';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `${type}-${value}`;
        input.value = value;
        input.checked = false; // Set to unchecked by default
        
        const label = document.createElement('label');
        label.htmlFor = `${type}-${value}`;
        label.textContent = value;
        
        // Add change event listener to update filters
        input.addEventListener('change', () => {
            if (input.checked) {
                this.filters[type].add(value);
            } else {
                this.filters[type].delete(value);
            }
            this.applyFilters();
        });
        
        div.appendChild(input);
        div.appendChild(label);
        return div;
    }

    applyFilters() {
        const features = this.map.getSource('trails')._data.features;
        features.forEach(feature => {
            const props = feature.properties;
            const exposureMatch = props.Trail_Text ? props.Trail_Text.match(/Exposure:\t([^\n]+)/) : null;
            const exposure = exposureMatch ? exposureMatch[1].trim() : null;
            
            const visible = (
                (this.filters.tech.size === 0 || this.filters.tech.has(props.Tech)) &&
                (this.filters.flow.size === 0 || this.filters.flow.has(props.Flow)) &&
                (this.filters.trailfeatures.size === 0 || this.filters.trailfeatures.has(props.Features)) &&
                (this.filters.exposure.size === 0 || this.filters.exposure.has(exposure)) &&
                (this.filters.wanderer.size === 0 || this.filters.wanderer.has(props.Wanderer)) &&
                (this.filters.status.size === 0 || this.filters.status.has(props.Status))
            );
            feature.properties.visible = visible;
        });

        this.map.getSource('trails').setData(this.map.getSource('trails')._data);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TerrainMap();
}); 