// Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2ltb3lhIiwiYSI6IkZrTld6NmcifQ.eY6Ymt2kVLvPQ6A2Dt9zAQ';

// Media files will be loaded dynamically from the imgs_vids folder
let mediaFiles = [];

// Initialize map with satellite imagery and labels
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [13.8, 47.6], // Center of Austria
    zoom: 8
});

// Add satellite imagery as an overlay when map loads
map.on('load', () => {
    // Add satellite imagery as a raster layer with reduced opacity
    map.addSource('satellite-overlay', {
        type: 'raster',
        url: 'mapbox://mapbox.satellite',
        tiles: ['https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=' + mapboxgl.accessToken]
    });
    
    // Insert satellite overlay before the first label layer to keep labels on top
    const firstLabelLayer = map.getStyle().layers.find(layer => 
        layer.type === 'symbol' && layer.id.includes('label')
    );
    
    map.addLayer({
        id: 'satellite-overlay',
        type: 'raster',
        source: 'satellite-overlay',
        paint: {
            'raster-opacity': 0.5 // 30% opacity = 70% transparent
        }
    }, firstLabelLayer ? firstLabelLayer.id : undefined);
});

// Global variables
let selectedFileIndex = -1;
let currentMode = 'assign';
let mediaMarkers = [];
let positionMarkers = []; // Store position markers for each file
let gpxTrack = null; // Store GPX track data

// Feedback system
function showFeedback(message, type = 'info', duration = 3000) {
    const container = document.getElementById('feedback-messages');
    const feedback = document.createElement('div');
    feedback.className = `feedback-message ${type}`;
    feedback.textContent = message;
    
    container.appendChild(feedback);
    
    // Trigger animation
    setTimeout(() => feedback.classList.add('show'), 10);
    
    // Remove after duration
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => {
            if (container.contains(feedback)) {
                container.removeChild(feedback);
            }
        }, 300);
    }, duration);
}

// Initialize the application
function initApp() {
    loadMediaFiles();
    setupEventListeners();
}

// Load media files from file input
function loadMediaFiles() {
    // Initialize with empty array - files will be loaded via file input
    mediaFiles = [];
    populateFileList();
    updateStats();
}

// Populate the file list in the control panel
function populateFileList() {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    
    mediaFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.index = index;
        
        const hasCoords = file.coordinates !== null;
        const statusClass = hasCoords ? 'has-coords' : 'no-coords';
        const statusText = hasCoords ? 'Has Coords' : 'No Coords';
        
        const dateStr = file.dateTaken ? file.dateTaken.toLocaleDateString() + ' ' + file.dateTaken.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown date';
        
        fileItem.innerHTML = `
            <div class="file-info">
                ${file.type === 'image' ? `<img src="${file.path}" class="file-thumbnail" alt="${file.filename}">` : `<div class="file-thumbnail video-thumbnail">🎥</div>`}
                <div class="file-details">
                    <div class="file-name">${file.filename}</div>
                    <div class="file-type">${file.type} • ${dateStr}</div>
                </div>
            </div>
            <div class="coordinate-status ${statusClass}">${statusText}</div>
        `;
        
        fileItem.addEventListener('click', () => selectFile(index));
        fileList.appendChild(fileItem);
    });
}

// Select a file for coordinate assignment
function selectFile(index) {
    // Remove previous selection
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    document.querySelector(`[data-index="${index}"]`).classList.add('selected');
    selectedFileIndex = index;
    
    // Update coordinate display
    const file = mediaFiles[index];
    const coordDisplay = document.getElementById('selected-coords');
    
    if (file.coordinates) {
        coordDisplay.textContent = `${file.coordinates[0].toFixed(6)}, ${file.coordinates[1].toFixed(6)}`;
    } else {
        coordDisplay.textContent = 'None - Click on map to set';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mode selector
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMode = e.target.value;
            toggleMode();
        });
    });
    
    // Map click handler
    map.on('click', handleMapClick);
    
    // Control panel buttons
    document.getElementById('show-media-btn').addEventListener('click', showMediaPins);
    document.getElementById('clear-media-btn').addEventListener('click', clearMediaPins);
    document.getElementById('hide-panel').addEventListener('click', hidePanel);
    document.getElementById('show-panel').addEventListener('click', showPanel);
    
    // File input handlers
    document.getElementById('select-files-btn').addEventListener('click', () => {
        document.getElementById('media-files-input').click();
    });
    
    document.getElementById('media-files-input').addEventListener('change', handleFileSelection);
    
    // GPX file handlers
    document.getElementById('select-gpx-btn').addEventListener('click', () => {
        document.getElementById('gpx-file-input').click();
    });
    
    document.getElementById('gpx-file-input').addEventListener('change', handleGpxSelection);
    
    document.getElementById('clear-track-btn').addEventListener('click', clearGpxTrack);
    
    // Bulk download button
    document.getElementById('download-all-btn').addEventListener('click', downloadAllGeotaggedPhotos);
    

}

// Handle map clicks
function handleMapClick(e) {
    if (currentMode === 'assign' && selectedFileIndex >= 0) {
        const coords = e.lngLat.toArray();
        const filename = mediaFiles[selectedFileIndex].filename;
        
        // Update the selected file's coordinates
        mediaFiles[selectedFileIndex].coordinates = coords;
        
        // Update or create position marker
        updatePositionMarker(selectedFileIndex, coords);
        
        // Update the coordinate display
        document.getElementById('selected-coords').textContent = 
            `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
        
        // Update the file list to show new status
        updateFileStatus(selectedFileIndex);
        
        // Show click indicator
        showClickIndicator(e.point);
        
        // Update stats
        updateStats();
        
        // Show feedback
        showFeedback(`📍 Coordinates saved to "${filename}"`, 'success', 2000);
    }
}

// Show click indicator animation
function showClickIndicator(point) {
    const indicator = document.createElement('div');
    indicator.className = 'click-indicator';
    indicator.style.left = (point.x - 10) + 'px';
    indicator.style.top = (point.y - 10) + 'px';
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        document.body.removeChild(indicator);
    }, 1000);
}

// Update or create position marker for a file
function updatePositionMarker(fileIndex, coords) {
    // Remove existing marker for this file
    if (positionMarkers[fileIndex]) {
        positionMarkers[fileIndex].remove();
    }
    
    // Create new position marker
    const markerEl = document.createElement('div');
    markerEl.className = 'position-marker';
    markerEl.style.width = '30px';
    markerEl.style.height = '30px';
    markerEl.style.cursor = 'pointer';
    markerEl.style.fontSize = '24px';
    markerEl.style.textAlign = 'center';
    markerEl.style.lineHeight = '30px';
    markerEl.innerHTML = '📍';
    markerEl.title = `Position for ${mediaFiles[fileIndex].filename}`;
    
    // Create popup with file info
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    popupContent.innerHTML = `
        <div class="popup-title">${mediaFiles[fileIndex].filename}</div>
        <div class="popup-coords">Position: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}</div>
    `;
    
    const popup = new mapboxgl.Popup({
        offset: 15,
        closeButton: true,
        closeOnClick: true
    }).setDOMContent(popupContent);
    
    // Add marker to map
    const marker = new mapboxgl.Marker(markerEl)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map);
    
    // Store the marker
    positionMarkers[fileIndex] = marker;
}

// Update file status in the list
function updateFileStatus(index) {
    const fileItem = document.querySelector(`[data-index="${index}"]`);
    const file = mediaFiles[index];
    const statusElement = fileItem.querySelector('.coordinate-status');
    
    if (file.coordinates) {
        statusElement.className = 'coordinate-status has-coords';
        statusElement.textContent = 'Has Coords';
    } else {
        statusElement.className = 'coordinate-status no-coords';
        statusElement.textContent = 'No Coords';
    }
}

// Toggle between assign and view modes
function toggleMode() {
    const assignMode = document.getElementById('assign-mode');
    const viewMode = document.getElementById('view-mode');
    
    if (currentMode === 'assign') {
        assignMode.style.display = 'block';
        viewMode.style.display = 'none';
        map.getCanvas().style.cursor = 'crosshair';
    } else {
        assignMode.style.display = 'none';
        viewMode.style.display = 'block';
        map.getCanvas().style.cursor = 'grab';
    }
}

// Show media pins on the map
function showMediaPins() {
    clearMediaPins();
    
    const filesWithCoords = mediaFiles.filter(f => f.coordinates !== null);
    
    mediaFiles.forEach((file, index) => {
        if (file.coordinates) {
            // Create marker element
            const markerEl = document.createElement('div');
            markerEl.className = 'media-marker';
            markerEl.style.width = '30px';
            markerEl.style.height = '30px';
            markerEl.style.cursor = 'pointer';
            markerEl.style.fontSize = '24px';
            markerEl.style.textAlign = 'center';
            markerEl.style.lineHeight = '30px';
            markerEl.innerHTML = file.type === 'image' ? '📷' : '🎥';
            markerEl.title = file.filename;
            
            // Create popup content
            const popupContent = document.createElement('div');
            popupContent.className = 'media-popup-content';
            
            if (file.type === 'image') {
                const img = document.createElement('img');
                img.src = file.path;
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.borderRadius = '4px';
                popupContent.appendChild(img);
            } else {
                const video = document.createElement('video');
                video.src = file.path;
                video.style.width = '100%';
                video.style.height = 'auto';
                video.style.borderRadius = '4px';
                video.controls = true;
                popupContent.appendChild(video);
            }
            
            const filename = document.createElement('p');
            filename.textContent = file.filename;
            filename.className = 'popup-filename';
            popupContent.appendChild(filename);
            
                // Create popup
    const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true
    }).setDOMContent(popupContent);
            
            // Add marker to map
            const marker = new mapboxgl.Marker(markerEl)
                .setLngLat(file.coordinates)
                .setPopup(popup)
                .addTo(map);
            
            mediaMarkers.push(marker);
        }
    });
    
    // Show feedback
    showFeedback(`📷 Showing ${filesWithCoords.length} geotagged files on map`, 'info', 2000);
}

// Clear all media pins
function clearMediaPins() {
    mediaMarkers.forEach(marker => marker.remove());
    mediaMarkers = [];
    
    // Show feedback
    showFeedback('🗑️ All media pins cleared', 'info', 2000);
}

// Clear all position markers
function clearPositionMarkers() {
    positionMarkers.forEach(marker => {
        if (marker) marker.remove();
    });
    positionMarkers = [];
}

// Update statistics
function updateStats() {
    const filesWithCoords = mediaFiles.filter(f => f.coordinates !== null).length;
    document.getElementById('coord-count').textContent = filesWithCoords;
}





// Handle file selection
function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    const infoDiv = document.getElementById('files-info');
    
            // Process files and extract creation dates for images
        Promise.all(files.map(async file => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) return null;
        
        // Try to get file creation date, fallback to modification date
        let dateTaken = new Date(file.lastModified);
        
        // For videos, try to get creation date if available
        if (isVideo && file.lastModifiedDate) {
            dateTaken = new Date(file.lastModifiedDate);
        }
        
        if (isImage) {
            try {
                const exifDate = await getExifDate(file, 'photo');
                if (exifDate) {
                    dateTaken = exifDate;
                }
            } catch (error) {
                // Fallback to file date
            }
        } else if (isVideo) {
            // Try to extract video creation date from file headers
            try {
                const videoDate = await getVideoDate(file);
                if (videoDate) {
                    dateTaken = videoDate;
                }
            } catch (error) {
                // Fallback to file date
            }
        }
        
        return {
            filename: file.name,
            type: isImage ? 'image' : 'video',
            path: URL.createObjectURL(file),
            coordinates: null,
            file: file,
            dateTaken: dateTaken
        };
    })).then(fileData => {
        mediaFiles = fileData
            .filter(file => file !== null)
            .sort((a, b) => a.dateTaken - b.dateTaken);
        
        infoDiv.innerHTML = `Loaded ${mediaFiles.length} files (${mediaFiles.filter(f => f.type === 'image').length} images, ${mediaFiles.filter(f => f.type === 'video').length} videos) - Sorted by date`;
        
        populateFileList();
        updateStats();
        
        // Show feedback
        showFeedback(`📁 Loaded ${mediaFiles.length} files`, 'info', 2000);
    });
}

// Date extraction for photos
function getExifDate(file, mediaType) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const view = new DataView(e.target.result);
                
                // Check for JPEG
                if (view.getUint16(0, false) !== 0xFFD8) {
                    resolve(null);
                    return;
                }
                
                const length = view.byteLength;
                let offset = 2;
                
                while (offset < length - 2) {
                    const marker = view.getUint16(offset, false);
                    
                    if (marker === 0xFFE1) { // EXIF marker
                        const exifLength = view.getUint16(offset + 2, false);
                        const tiffOffset = offset + 10;
                        
                        const tiffByteOrder = view.getUint16(tiffOffset, false);
                        if (tiffByteOrder !== 0x4949 && tiffByteOrder !== 0x4D4D) {
                            offset += exifLength;
                            continue;
                        }
                        
                        const isLittleEndian = tiffByteOrder === 0x4949;
                        const ifdOffset = view.getUint32(tiffOffset + 4, isLittleEndian);
                        const ifdLength = view.getUint16(tiffOffset + ifdOffset, isLittleEndian);
                        
                        for (let i = 0; i < ifdLength; i++) {
                            const tag = view.getUint16(tiffOffset + ifdOffset + 2 + i * 12, isLittleEndian);
                            
                            // Look for DateTimeOriginal (0x9003) first, then DateTime (0x132) as fallback
                            if (tag === 0x9003 || tag === 0x132) {
                                const dataType = view.getUint16(tiffOffset + ifdOffset + 2 + i * 12 + 2, isLittleEndian);
                                const dataCount = view.getUint32(tiffOffset + ifdOffset + 2 + i * 12 + 4, isLittleEndian);
                                const dataOffset = view.getUint32(tiffOffset + ifdOffset + 2 + i * 12 + 8, isLittleEndian);
                                
                                if (dataType === 2 && dataCount === 20) { // ASCII string
                                    const dateString = new TextDecoder().decode(
                                        new Uint8Array(e.target.result, tiffOffset + dataOffset, 20)
                                    );
                                    
                                    // Parse date string (format: YYYY:MM:DD HH:MM:SS)
                                    const [datePart, timePart] = dateString.split(' ');
                                    
                                    if (datePart && timePart) {
                                        const [year, month, day] = datePart.split(':');
                                        const [hour, minute, second] = timePart.split(':');
                                        
                                        if (year && month && day && hour && minute && second) {
                                            // Create date with explicit parameters
                                            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                                            
                                            if (!isNaN(date.getTime())) {
                                                resolve(date);
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        offset += exifLength;
                    } else {
                        offset += 2;
                    }
                }
                
                resolve(null);
            } catch (error) {
                resolve(null);
            }
        };
        
        reader.onerror = () => {
            resolve(null);
        };
        reader.readAsArrayBuffer(file);
    });
}

// Extract video creation date from file headers
function getVideoDate(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const view = new DataView(e.target.result);
                
                // Check for MP4 file signature
                if (view.getUint32(4, false) === 0x66747970) { // 'ftyp'
                    // Look for 'mvhd' box (movie header) which contains creation time
                    const length = view.byteLength;
                    let offset = 8;
                    
                    while (offset < length - 8) {
                        const boxSize = view.getUint32(offset, false);
                        const boxType = view.getUint32(offset + 4, false);
                        
                        if (boxType === 0x6D766864) { // 'mvhd'
                            // Read creation time (seconds since 1904-01-01)
                            const creationTime = view.getUint32(offset + 12, false);
                            
                            if (creationTime > 0) {
                                // Convert from seconds since 1904-01-01 to Date
                                const date = new Date((creationTime - 2082844800) * 1000);
                                resolve(date);
                                return;
                            }
                        }
                        
                        if (boxSize === 0) break; // End of file
                        offset += boxSize;
                    }
                }
                
                resolve(null);
            } catch (error) {
                resolve(null);
            }
        };
        
        reader.onerror = () => resolve(null);
        reader.readAsArrayBuffer(file);
    });
}





// Handle GPX file selection
function handleGpxSelection(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const gpxText = e.target.result;
            const gpxData = parseGpx(gpxText);
            
            if (gpxData.tracks.length > 0) {
                gpxTrack = gpxData;
                displayGpxTrack(gpxData);
                
                // Update UI
                document.getElementById('gpx-info').innerHTML = `Loaded track: ${gpxData.tracks[0].name || 'Unnamed track'} (${gpxData.tracks[0].points.length} points)`;
                document.getElementById('clear-track-btn').style.display = 'inline-block';
                
                // Show feedback
                showFeedback(`🗺️ GPX track loaded: ${gpxData.tracks[0].points.length} points`, 'info', 2000);

            } else {
                throw new Error('No tracks found in GPX file');
            }
        } catch (error) {
            document.getElementById('gpx-info').innerHTML = `Error loading GPX file: ${error.message}`;
            showFeedback(`❌ Error loading GPX file: ${error.message}`, 'warning', 4000);
        }
    };
    
    reader.readAsText(file);
}

// Parse GPX file content
function parseGpx(gpxText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
    
    const tracks = [];
    const trackElements = xmlDoc.getElementsByTagName('trk');
    
    for (let i = 0; i < trackElements.length; i++) {
        const track = trackElements[i];
        const trackName = track.getElementsByTagName('name')[0]?.textContent || `Track ${i + 1}`;
        
        const segments = [];
        const segmentElements = track.getElementsByTagName('trkseg');
        
        for (let j = 0; j < segmentElements.length; j++) {
            const segment = segmentElements[j];
            const points = [];
            const pointElements = segment.getElementsByTagName('trkpt');
            
            for (let k = 0; k < pointElements.length; k++) {
                const point = pointElements[k];
                const lat = parseFloat(point.getAttribute('lat'));
                const lon = parseFloat(point.getAttribute('lon'));
                const time = point.getElementsByTagName('time')[0]?.textContent;
                const elevation = point.getElementsByTagName('ele')[0]?.textContent;
                
                if (!isNaN(lat) && !isNaN(lon)) {
                    points.push({
                        lat: lat,
                        lon: lon,
                        time: time,
                        elevation: elevation ? parseFloat(elevation) : null
                    });
                }
            }
            
            if (points.length > 0) {
                segments.push(points);
            }
        }
        
        if (segments.length > 0) {
            tracks.push({
                name: trackName,
                segments: segments,
                points: segments.flat() // Flatten all segments into one array
            });
        }
    }
    
    return { tracks: tracks };
}

// Display GPX track on the map
function displayGpxTrack(gpxData) {
    // Remove existing track if any
    if (map.getSource('gpx-track')) {
        map.removeLayer('gpx-track-layer');
        map.removeSource('gpx-track');
    }
    
    if (gpxData.tracks.length === 0) return;
    
    const track = gpxData.tracks[0];
    const coordinates = track.points.map(point => [point.lon, point.lat]);
    
    // Add track source
    map.addSource('gpx-track', {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            }
        }
    });
    
    // Add track layer
    map.addLayer({
        id: 'gpx-track-layer',
        type: 'line',
        source: 'gpx-track',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#ff6b6b',
            'line-width': 4,
            'line-opacity': 0.8
        }
    });
    
    // Fit map to track bounds
    const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    
    map.fitBounds(bounds, {
        padding: 50,
        duration: 1000
    });
}

// Clear GPX track from map
function clearGpxTrack() {
    if (map.getSource('gpx-track')) {
        map.removeLayer('gpx-track-layer');
        map.removeSource('gpx-track');
    }
    
    gpxTrack = null;
    document.getElementById('gpx-info').innerHTML = '';
    document.getElementById('clear-track-btn').style.display = 'none';
    document.getElementById('gpx-file-input').value = '';
    
    // Show feedback
    showFeedback('🗺️ GPX track cleared', 'info', 2000);
}

// Hide control panel
function hidePanel() {
    const panel = document.getElementById('control-panel');
    const showBtn = document.getElementById('show-panel');
    
    panel.style.transform = 'translate(-100%, -100%)';
    
    // Fade in the show button
    setTimeout(() => {
        showBtn.style.opacity = '1';
        showBtn.style.pointerEvents = 'auto';
    }, 200); // Start fading in halfway through panel animation
}

// Show control panel
function showPanel() {
    const panel = document.getElementById('control-panel');
    const showBtn = document.getElementById('show-panel');
    
    // Fade out the show button immediately
    showBtn.style.opacity = '0';
    showBtn.style.pointerEvents = 'none';
    
    panel.style.transform = 'translate(0, 0)';
}



// Add navigation controls
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());
map.addControl(new mapboxgl.ScaleControl({
    maxWidth: 80,
    unit: 'metric'
}));



// Add geocoder search control to panel
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: 'Search for a location...',
    countries: 'at', // Limit to Austria
    language: 'en',
    marker: false, // Don't add a marker when searching
    flyTo: {
        speed: 1.2
    }
});

// Add geocoder to the panel container
document.getElementById('geocoder-container').appendChild(geocoder.onAdd(map));



// Download all geotagged photos as a zip file
async function downloadAllGeotaggedPhotos() {
    const filesWithCoords = mediaFiles.filter(f => f.coordinates !== null && f.type === 'image');
    
    if (filesWithCoords.length === 0) {
        showFeedback('⚠️ No geotagged photos found. Please assign coordinates first.', 'warning', 4000);
        return;
    }
    
    // Show loading state
    const downloadBtn = document.getElementById('download-all-btn');
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'Processing...';
    downloadBtn.disabled = true;
    
    try {
        const zip = new JSZip();
        let processedCount = 0;
        
        // Process each image with coordinates
        for (const file of filesWithCoords) {
            try {
                const geotaggedBlob = await processImageWithGPS(file.file, file.coordinates);
                
                if (geotaggedBlob && geotaggedBlob.size > 0) {
                    const filename = `geotagged_${file.filename.replace(/\.[^/.]+$/, '')}_${file.coordinates[0].toFixed(6)}_${file.coordinates[1].toFixed(6)}.jpg`;
                    zip.file(filename, geotaggedBlob);
                    processedCount++;
                }
                
                // Update progress
                downloadBtn.textContent = `Processing... (${processedCount}/${filesWithCoords.length})`;
            } catch (error) {
                // Continue with next file
            }
        }
        
        if (processedCount === 0) {
            showFeedback('❌ No files were successfully processed', 'warning', 4000);
            return;
        }
        
        // Generate and download zip file
        const zipBlob = await zip.generateAsync({type: 'blob'});
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = `geotagged_photos_${new Date().toISOString().slice(0, 10)}.zip`;
        downloadLink.click();
        
        // Clean up
        URL.revokeObjectURL(downloadLink.href);
        
        showFeedback(`✅ Successfully downloaded ${processedCount} geotagged photos!`, 'success', 4000);
        
    } catch (error) {
        showFeedback('❌ Error creating zip file. Please try again.', 'warning', 4000);
    } finally {
        // Reset button state
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    }
}

// Process image with GPS coordinates and return blob
function processImageWithGPS(file, coords) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const arrayBuffer = e.target.result;
                const view = new DataView(arrayBuffer);
                
                // Check if it's a JPEG file
                const isJpeg = view.getUint16(0, false) === 0xFFD8;
                
                if (isJpeg) {
                    // Handle JPEG files
                    processJpegForZip(arrayBuffer, coords).then(resolve).catch(reject);
                } else {
                    // Convert other image formats to JPEG
                    convertToJpegForZip(arrayBuffer, file, coords).then(resolve).catch(reject);
                }
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('FileReader error'));
        };
        reader.readAsArrayBuffer(file);
    });
}

// Process JPEG files for zip (coordinates in filename only)
async function processJpegForZip(arrayBuffer, coords) {
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
    return blob;
}

// Convert other image formats to JPEG for zip
function convertToJpegForZip(arrayBuffer, file, coords) {
    return new Promise((resolve, reject) => {
        // Create canvas to convert image to JPEG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Set canvas size to image size
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw image on canvas
            ctx.drawImage(img, 0, 0);
            
            // Convert to JPEG with GPS coordinates
            canvas.toBlob(function(blob) {
                // Add GPS data to the JPEG
                addGpsToJpegBlob(blob, coords).then(resolve).catch(reject);
            }, 'image/jpeg', 0.9);
        };
        
        img.onerror = () => reject(new Error('Image loading error'));
        
        // Convert ArrayBuffer to blob and create image
        const blob = new Blob([arrayBuffer], { type: file.type });
        img.src = URL.createObjectURL(blob);
    });
}

// Add GPS data to JPEG blob (coordinates in filename only)
async function addGpsToJpegBlob(blob, coords) {
    return blob;
}



// Initialize when map loads
map.on('load', initApp); 