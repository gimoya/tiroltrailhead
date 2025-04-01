// Initialize the map
const map = L.map('map', {
    zoomControl: false  // Disable default zoom control
}).setView([47.2692, 11.4041], 10); // Centered on Tirol

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© CartoDB, OpenStreetMap contributors'
}).addTo(map);

// Add zoom control to top right
L.control.zoom({
    position: 'topright'
}).addTo(map);

L.control.locate({
    position: 'topright',
    strings: {
        title: "Show my location"
    },
    locateOptions: {
        maxZoom: 16
    }
}).addTo(map);

// Add download button to bottom left
L.Control.downloadButton = L.Control.extend({
    options: {
        position: 'topright'
    },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', 'download-button', container);
        button.innerHTML = '<i class="fas fa-download fa-lg"></i>';
        button.title = 'Download GPX';
        button.href = 'TheHunt25.gpx';
        button.download = 'TheHunt25.gpx';
        return container;
    }
});

new L.Control.downloadButton().addTo(map);

// Function to load and display GPX file
function loadGPXFile(url) {
    const markers = []; // Array to store all markers
    
    fetch(url)
        .then(response => response.text())
        .then(gpxData => {
            // Create a temporary div to parse the GPX
            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(gpxData, 'text/xml');
            
            // Parse tracks
            const tracks = gpxDoc.getElementsByTagName('trk');
            for (let track of tracks) {
                const trackName = track.getElementsByTagName('name')[0]?.textContent || 'Unnamed Track';
                const trackSegments = track.getElementsByTagName('trkseg');
                
                for (let segment of trackSegments) {
                    const points = segment.getElementsByTagName('trkpt');
                    const latlngs = [];
                    
                    for (let point of points) {
                        const lat = parseFloat(point.getAttribute('lat'));
                        const lon = parseFloat(point.getAttribute('lon'));
                        latlngs.push([lat, lon]);
                    }
                    
                    // Create polyline for the track
                    const polyline = L.polyline(latlngs, {
                        color: '#0cc0df',
                        weight: 4,
                        opacity: 0.9,
                        className: 'animated-track'
                    }).addTo(map);
                    
                    // Add moving emoji
                    const emojiMarker = L.marker(latlngs[0], {
                        icon: L.divIcon({
                            className: 'moving-emoji',
                            html: '🦸‍♀️',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    }).addTo(map);

                    // Animate emoji along the track
                    let currentIndex = 0;
                    const animateEmoji = () => {
                        if (currentIndex < latlngs.length) {
                            const currentLatLng = L.latLng(latlngs[currentIndex]);
                            emojiMarker.setLatLng(currentLatLng);
                            
                            // Check distance to all markers and trigger rotation if close
                            markers.forEach(marker => {
                                const markerLatLng = marker.getLatLng();
                                const distance = currentLatLng.distanceTo(markerLatLng);
                                if (distance < 20) { // 20 meters threshold
                                    const icon = marker.getElement().querySelector('i');
                                    if (icon) {
                                        icon.classList.add('rotate', 'gold');
                                        setTimeout(() => {
                                            icon.classList.remove('rotate', 'gold');
                                        }, 1000);
                                    }
                                }
                            });
                            
                            currentIndex++;
                            // Control emoji speed here - lower number = faster, higher number = slower
                            setTimeout(animateEmoji, 80); // Currently set to 100ms between points
                        } else {
                            currentIndex = 0;
                            animateEmoji();
                        }
                    };
                    animateEmoji();
                    
                    // Add popup to the track
                    polyline.bindPopup(`<div class="trailPopupClass"><div class="pop_cont_name">${trackName}</div></div>`);
                }
            }
            
            // Parse waypoints
            const waypoints = gpxDoc.getElementsByTagName('wpt');
            for (let waypoint of waypoints) {
                const lat = parseFloat(waypoint.getAttribute('lat'));
                const lon = parseFloat(waypoint.getAttribute('lon'));
                const name = waypoint.getElementsByTagName('name')[0]?.textContent || 'Unnamed Waypoint';
                const desc = waypoint.getElementsByTagName('desc')[0]?.textContent || '';
                
                // Create marker based on name
                let marker;
                if (name.toLowerCase().includes('start')) {
                    marker = L.marker([lat, lon], {
                        icon: L.divIcon({
                            className: 'custom-div-icon',
                            html: "<i class='fas fa-flag start-flag'></i>",
                            iconSize: [30, 42],
                            iconAnchor: [15, 35]
                        })
                    }).addTo(map);

                } else if (name.toLowerCase().includes('end')) {
                    marker = L.marker([lat, lon], {
                        icon: L.divIcon({
                            className: 'custom-div-icon',
                            html: "<i class='fas fa-flag end-flag'></i>",
                            iconSize: [30, 42],
                            iconAnchor: [15, 35]
                        })
                    }).addTo(map);

                } else {
                    marker = L.marker([lat, lon], {
                        icon: L.divIcon({
                            className: 'custom-div-icon',
                            html: "<i class='fas fa-hashtag'></i>",
                            iconSize: [30, 42],
                            iconAnchor: [15, 35]
                        })
                    }).addTo(map);
                }
                
                // Add marker to our array
                markers.push(marker);
                
                // Add popup to the waypoint
                marker.bindPopup(`
                    <div class="trailPopupClass">
                        <div class="pop_cont_name">${name}</div>
                        ${desc ? `<div class="pop_gpx_text"><pre>${desc}</pre></div>` : ''}
                    </div>
                `);
            }
            
            map.setView([47.276, 11.41], 14);

        })
        .catch(error => {
            console.error('Error loading GPX file:', error);
            document.getElementById('errorMsg').textContent = 'Error loading GPX file. Please check the console for details.';
        });
}

// Load the GPX file
loadGPXFile('TheHunt25.gpx'); 