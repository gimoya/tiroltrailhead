import os
import json
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import subprocess
import sys

def get_exif_data(image_path):
    """Extract EXIF data from image file"""
    try:
        image = Image.open(image_path)
        exif = image._getexif()
        if exif is None:
            return None
        
        exif_data = {}
        for tag_id in exif:
            tag = TAGS.get(tag_id, tag_id)
            data = exif[tag_id]
            if tag == "GPSInfo":
                gps_data = {}
                for gps_tag_id in data:
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_data[gps_tag] = data[gps_tag_id]
                exif_data[tag] = gps_data
            else:
                exif_data[tag] = data
        
        return exif_data
    except Exception as e:
        print(f"Error reading {image_path}: {e}")
        return None

def convert_to_degrees(value):
    """Convert GPS coordinates to decimal degrees"""
    d = float(value[0])
    m = float(value[1])
    s = float(value[2])
    return d + (m / 60.0) + (s / 3600.0)

def get_gps_coordinates(exif_data):
    """Extract GPS coordinates from EXIF data"""
    if not exif_data or 'GPSInfo' not in exif_data:
        return None
    
    gps_info = exif_data['GPSInfo']
    
    try:
        lat_ref = gps_info.get('GPSLatitudeRef', 'N')
        lat = gps_info.get('GPSLatitude')
        lon_ref = gps_info.get('GPSLongitudeRef', 'E')
        lon = gps_info.get('GPSLongitude')
        
        if lat and lon:
            lat_deg = convert_to_degrees(lat)
            lon_deg = convert_to_degrees(lon)
            
            if lat_ref == 'S':
                lat_deg = -lat_deg
            if lon_ref == 'W':
                lon_deg = -lon_deg
            
            return [lon_deg, lat_deg]
    except Exception as e:
        print(f"Error converting GPS coordinates: {e}")
    
    return None

def extract_media_info():
    """Extract GPS coordinates from all media files"""
    media_files = []
    imgs_vids_dir = "imgs_vids"
    
    if not os.path.exists(imgs_vids_dir):
        print(f"Directory {imgs_vids_dir} not found!")
        return []
    
    for filename in os.listdir(imgs_vids_dir):
        file_path = os.path.join(imgs_vids_dir, filename)
        
        # Check if it's an image file
        if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
            exif_data = get_exif_data(file_path)
            gps_coords = get_gps_coordinates(exif_data)
            
            if gps_coords:
                media_files.append({
                    'filename': filename,
                    'type': 'image',
                    'path': file_path,
                    'coordinates': gps_coords
                })
                print(f"Found GPS data for {filename}: {gps_coords}")
            else:
                print(f"No GPS data found for {filename}")
        
        # For video files, we'll need to use ffprobe or similar
        elif filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
            # For now, we'll add them without coordinates
            # You can manually add coordinates later
            media_files.append({
                'filename': filename,
                'type': 'video',
                'path': file_path,
                'coordinates': None
            })
            print(f"Video file {filename} - coordinates need to be added manually")
    
    return media_files

if __name__ == "__main__":
    media_info = extract_media_info()
    
    # Save to JSON file
    with open('media_coordinates.json', 'w') as f:
        json.dump(media_info, f, indent=2)
    
    print(f"\nExtracted information for {len(media_info)} files")
    print("Data saved to media_coordinates.json")
    
    # Print summary
    with_coords = [f for f in media_info if f['coordinates']]
    without_coords = [f for f in media_info if not f['coordinates']]
    
    print(f"Files with GPS coordinates: {len(with_coords)}")
    print(f"Files without GPS coordinates: {len(without_coords)}") 