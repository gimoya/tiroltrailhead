# Geotagged Media Map Project

A Mapbox GL JS project that displays geotagged images and videos on an OpenStreetMap (OSM) base layer.

## Project Structure

```
Video_Map_Fiddle/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # CSS styles for the map and markers
├── js/
│   └── map.js              # JavaScript functionality
├── imgs_vids/              # Folder containing geotagged media files
├── extract_gps.py          # Python script to extract GPS coordinates
├── media_coordinates.json  # Generated file with media coordinates
└── README.md               # This file
```

## Features

- **OSM Base Map**: Uses OpenStreetMap tiles for the base layer
- **Geotagged Media Display**: Shows images and videos at their GPS coordinates
- **Interactive Markers**: Click markers to view media in popups
- **Media Support**: Displays both images and videos with controls
- **Navigation Controls**: Zoom, pan, fullscreen, and scale controls
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

1. **Get a Mapbox Access Token**: 
   - Go to [https://account.mapbox.com](https://account.mapbox.com)
   - Create an account or sign in
   - Generate an access token

2. **Update the Access Token**:
   - Open `js/map.js`
   - Replace the access token with your actual Mapbox access token

3. **Add Your Media Files**:
   - Place geotagged images and videos in the `imgs_vids/` folder
   - Run `python extract_gps.py` to extract GPS coordinates
   - The script will automatically detect GPS data from images
   - For videos, you may need to manually add coordinates to the JSON file

4. **Run the Project**:
   - Open `index.html` in a web browser
   - Or serve the files using a local web server

## Media File Support

- **Images**: JPG, JPEG, PNG, BMP, TIFF (with EXIF GPS data)
- **Videos**: MP4, AVI, MOV, MKV (GPS data extraction may require additional tools)

## Current Media Files

The project currently displays:
- 2 geotagged images from Austria (Innsbruck area)
- Coordinates: [13.1983932, 47.3232501] and [13.1991339, 47.3160131]

## Dependencies

- Mapbox GL JS v3.14.0 (loaded via CDN)
- Python 3.x with PIL/Pillow (for GPS extraction)
- Modern web browser with JavaScript enabled
- OpenStreetMap tiles (free, no API key required)

## Usage

- **View Media**: Click on markers to open popups with images/videos
- **Navigate**: Use mouse/touch to pan and zoom
- **Controls**: Use the navigation controls for zoom in/out and fullscreen
- **Scale**: View the map scale in the bottom-left corner 