import math
import os
import gpxpy
import folium
from dataclasses import dataclass
from typing import List, Optional, Tuple
from datetime import datetime
import numpy as np

@dataclass
class Point:
    lat: float
    lon: float
    ele: Optional[float] = None

def calculate_middle_point_corner(A: Point, B: Point, C: Point, Radius: float) -> Point:
    """
    Calculate the middle point of a rounded corner between three points A, B, and C, where the corner 
    is rounded with a circle of given radius that is inscribed between the vectors BA and BC.

    Algorithm approach:
    1. Take the shorter vector of vectors BA and BC (-> name it BS) and 
       calculate the the vector BF, where F is a point on BS, for which the perpendicular vector
       starting at point F and ending at the section with the bisector, has the same length as the the given radius.
    2. Check if the length of BF that we get for the given Radius is shorter then BS to retain the 
       original end point of the vector BS! Exit with an error message if this is not the case!
    3. Return the section point of the perpendicular vector BF with the bisector as the middle point 
       of the rounded corner.
    
    Mathematical approach:
    1. Calculate vectors BA and BC from the input points
    2. Find the cosine of the angle between BA and BC using dot product
    3. Use the relationship tan(a/2) = sqrt((1-cos(a))/(1+cos(a))) to get the tangent of half the angle
    4. Calculate the length of vector BF (from B to F) on the shorter vector BS using the radius and tangent
    5. Calculate point F by scaling the unit vector of BS
    6. Determine rotation direction using cross product sign
    7. Calculate the center point O of the inscribed circle by rotating a radius vector from F
    
    The result is the center point O of the circle that is inscribed between the vectors BA and BC,
    with the circle having the specified radius and being tangent to both vectors.
    """
    # Calculate vectors BA and BC
    BA = (A.lat - B.lat, A.lon - B.lon)
    BC = (C.lat - B.lat, C.lon - B.lon)
    
    # Helper functions for vector operations
    def length(v):
        """Calculate the length of a vector"""
        return math.sqrt(v[0] * v[0] + v[1] * v[1])
    
    def dot_product(v1, v2):
        """Calculate the dot product of two vectors"""
        return v1[0] * v2[0] + v1[1] * v2[1]
    
    def cosine_between(v1, v2):
        """Calculate the cosine of the angle between two vectors using dot product"""
        return dot_product(v1, v2) / (length(v1) * length(v2))
    
    def unit(v):
        """Convert a vector to its unit vector (normalized)"""
        l = length(v)
        return (v[0] / l, v[1] / l)
    
    def scalar_multiply(v, n):
        """Multiply a vector by a scalar"""
        return (v[0] * n, v[1] * n)
    
    def add(v1, v2):
        """Add two vectors"""
        return (v1[0] + v2[0], v1[1] + v2[1])
    
    def rotate_by_90_degrees(v, sign):
        """Rotate a vector by 90 degrees (clockwise or counterclockwise based on sign)"""
        return (-v[1] * sign, v[0] * sign)
    
    # Calculate cosine of angle between BA and BC
    cos_a = cosine_between(BA, BC)
    # Use the relationship tan(a/2) = sqrt((1-cos(a))/(1+cos(a)))
    tan_half_a = math.sqrt((1 - cos_a) / (1 + cos_a))
    # Calculate the length of vector BF using the radius and tangent
    BF_length = Radius / tan_half_a
    
    # Calculate vector BF by scaling the unit vector of the shorter vector of BA and BC
    # BL is the longer vector of BA and BC which we need for cross product calculation
    BS = BA if length(BA) < length(BC) else BC
    BL = BC if length(BC) > length(BA) else BA
    BF = scalar_multiply(unit(BS), BF_length)
    
    # Check if the length of BF that we get for the given Radius is shorter then BS to retain the 
    # original end point of the vector BS! Exit with an error message if this is not the case!
    if length(BF) > length(BS):
        raise ValueError("The length of BF that we get for the given Radius is shorter then BS!\n" +
                         "This would result in a ponit F that does not lie on the vectors BA or BC...")
    # Calculate sign for rotation using cross product
    # This determines whether to rotate clockwise or counterclockwise
    sign = math.copysign(1, BS[0] * BL[1] - BS[1] * BL[0])
    
    # Calculate point F by adding vector BF to point B
    F = (B.lat + BF[0], B.lon + BF[1])
    
    # Calculate middle point O by:
    # 1. Taking a vector of length radius in the direction of BA
    # 2. Rotating it 90 degrees (clockwise or counterclockwise)
    # 3. Adding it to point F
    O = add(F, rotate_by_90_degrees(scalar_multiply(unit(BS), Radius), sign))
    
    return Point(O[0], O[1])




def create_comparison_report(original_gpx: str, smoothed_gpx: str, output_dir: str) -> str:
    """Create a markdown report comparing original and smoothed tracks"""
    # Parse both GPX files
    original = gpxpy.parse(open(original_gpx, 'r'))
    smoothed = gpxpy.parse(open(smoothed_gpx, 'r'))
    
    # Create a map centered on the tracks
    points = []
    for track in original.tracks:
        for segment in track.segments:
            points.extend([(p.latitude, p.longitude) for p in segment.points])
    
    lats = [p[0] for p in points]
    lons = [p[1] for p in points]
    center_lat = sum(lats) / len(lats)
    center_lon = sum(lons) / len(lons)
    
    m = folium.Map(location=[center_lat, center_lon], zoom_start=13)
    
    # Add original track in red
    for track in original.tracks:
        for segment in track.segments:
            points = [(p.latitude, p.longitude) for p in segment.points]
            folium.PolyLine(points, weight=3, color='red', opacity=0.8, name='Original Track').add_to(m)
    
    # Add smoothed track in blue
    for track in smoothed.tracks:
        for segment in track.segments:
            points = [(p.latitude, p.longitude) for p in segment.points]
            folium.PolyLine(points, weight=3, color='blue', opacity=0.8, name='Smoothed Track').add_to(m)
    
    # Add layer control
    folium.LayerControl().add_to(m)
    
    # Save map to HTML file
    map_filename = f"map_{os.path.basename(original_gpx).replace('.gpx', '.html')}"
    map_path = os.path.join(output_dir, map_filename)
    m.save(map_path)
    
    # Create section for this track
    section = f"""## {os.path.basename(original_gpx)}

### Track Comparison Map
[View interactive map]({map_filename})

### Track Statistics

#### Original Track
- Number of tracks: {len(original.tracks)}
- Total segments: {sum(len(track.segments) for track in original.tracks)}
- Total points: {sum(len(segment.points) for track in original.tracks for segment in track.segments)}

#### Smoothed Track
- Number of tracks: {len(smoothed.tracks)}
- Total segments: {sum(len(track.segments) for track in smoothed.tracks)}
- Total points: {sum(len(segment.points) for track in smoothed.tracks for segment in track.segments)}

---
"""
    return section

  
def main():
    # Create output directory if it doesn't exist
    output_dir = "smoothed_gpx"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"\nCreated output directory: {output_dir}")

    # Process all GPX files in current directory
    gpx_files = [f for f in os.listdir('.') if f.endswith('.gpx')]

    if not gpx_files:
        print("\nNo GPX files found in current directory, exiting module!..")
        return

    print("\ngpx files found in directory:")
    for gpx_file in gpx_files:
        print(f"{gpx_file}")
    
    # Create the main report content
    report_content = """# GPX Track Smoothing Report

## Overview
This report compares original GPX tracks with their smoothed versions, where sharp curves have been replaced with circular sectors.

## Legend
- Red line: Original track
- Blue line: Smoothed track with inscribed circles

## Notes
- The smoothed track replaces sharp curves with circular sectors of radius 10 meters
- Original elevation data is preserved
- Interactive maps are available as separate HTML files

## Track Comparisons

"""
    
    # Process each GPX file and add its section to the report
    for gpx_file in gpx_files:
        print(f"\nProcessing {gpx_file}...")

        gpx = gpxpy.parse(open(gpx_file, 'r'))

        if gpx.tracks and gpx.tracks[0].segments and gpx.tracks[0].segments[0].points[0]:
            # Check contents
            t=0
            for track in gpx.tracks:
                t+=1
                s=0
                for segment in track.segments:
                    s+=1
                    # Convert segment points to our Point class
                    points = [Point(p.latitude, p.longitude, p.elevation) for p in segment.points]
                    # Smooth the track with a fixed radius (e.g., 10 meters)
                    smoothed_points = smooth_track(points, 10)
                    # Update segment points with smoothed points
                    segment.points.clear()
                    for p in smoothed_points:
                        segment.points.append(gpxpy.gpx.GPXTrackPoint(latitude=p.lat, longitude=p.lon, elevation=p.ele))
                print(f"Track {t} has {s} segment(s)")
            
            # Save the smoothed GPX to the output directory
            output_file = os.path.join(output_dir, f"smoothed_{gpx_file}")
            with open(output_file, 'w') as f:
                f.write(gpx.to_xml())
            print(f"Saved smoothed GPX to: {output_file}")
            
            # Add this track's comparison to the report
            section = create_comparison_report(gpx_file, output_file, output_dir)
            report_content += section
        else:
            print("gpx check failed: gpx file does not contain track or track-segments with track points...")    
            return
    
    # Save the complete report
    report_file = os.path.join(output_dir, "track_comparison_report.md")
    with open(report_file, 'w') as f:
        f.write(report_content)
    print(f"\nSaved complete comparison report to: {report_file}")

if __name__ == "__main__":
    main() 