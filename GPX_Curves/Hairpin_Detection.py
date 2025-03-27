import math
import os
import gpxpy
import folium
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
import math
import numpy as np

# Global configuration parameters
LOOK_AHEAD_DISTANCE = 20     # meters
CURVE_ANGLE_THRESHOLD = 100  # degrees
SMOOTHING = False            

@dataclass
class Edge:
    point1: 'GPXTrackPoint'
    point2: 'GPXTrackPoint'
    length: float                           # in meters
    elev_diff: float                        # in meters
    time_diff: int                          # seconds
    bearing: float                          # degrees from north (0-360)
    angle_to_last_edge: float = 0           # last edge angle in degrees
    is_hairpin_edge: bool = False           # True if edge is apart of a hairpin

def chaikins_corner_cutting(points, refinements=2):
    """Apply Chaikin's corner cutting to GPXTrackPoints"""
    # Convert GPXTrackPoints to numpy array of coordinates
    coords = np.array([(p.latitude, p.longitude) for p in points])
    
    print(f"Starting with {len(coords)} points")
    
    for _ in range(refinements):
        new_coords = []
        new_coords.append(coords[0])  # Keep first point
        
        # Apply corner cutting to each pair of points
        for i in range(len(coords) - 1):
            p0 = coords[i]
            p1 = coords[i + 1]
            
            # Create two new points that are 1/4 and 3/4 along each line segment
            q = p0 * 0.75 + p1 * 0.25  # Point at 1/4
            r = p0 * 0.25 + p1 * 0.75  # Point at 3/4
            
            new_coords.append(q)
            new_coords.append(r)
            
        new_coords.append(coords[-1])  # Keep last point
        coords = np.array(new_coords)
        print(f"After refinement {_+1}: {len(coords)} points")

    # Convert back to GPXTrackPoints
    smoothed_points = []
    for lat, lon in coords:
        point = gpxpy.gpx.GPXTrackPoint(
            latitude=float(lat),
            longitude=float(lon)
        )
        smoothed_points.append(point)

    return smoothed_points

# calculate bearing from point1 to point2
def calculate_bearing(p1, p2):
    # Convert latitude/longitude to radians
    lat1, lon1 = math.radians(p1.latitude), math.radians(p1.longitude)
    lat2, lon2 = math.radians(p2.latitude), math.radians(p2.longitude)
    
    # Calculate bearing
    d_lon = lon2 - lon1
    y = math.sin(d_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lon)
    bearing = math.degrees(math.atan2(y, x))
    
    # Normalize to 0-360
    return (bearing + 360) % 360

def create_edges(segment_points) -> List[Edge]:
    # create edges for one segment of a track
    edges = []
    
    # Skip if less than 2 points
    if len(segment_points) < 2:
        print("Only one trackpoint in segment - segment creation will be terminated!..")
        return edges
    
    # Create edges from consecutive points
    for i in range(len(segment_points) - 1):
        p1 = segment_points[i]
        p2 = segment_points[i + 1]
        
        # elevation
        if p1.elevation is None or p2.elevation is None:
            elev_diff = None
        else:
            # Calculate elev_diff
            elev_diff = p2.elevation - p1.elevation

        # timestamp
        if p1.time and p2.time:
            # Calculate time_diff
            time_diff = (p2.time - p1.time).total_seconds()
        else:
            time_diff = None

        # distance in meters  
        length = p1.distance_2d(p2)  
        
        # bearing from north
        bearing = calculate_bearing(p1, p2)
        
        # add edge 
        edges.append(Edge(
            point1=p1,
            point2=p2,
            length=length,
            elev_diff=elev_diff,
            time_diff=time_diff,
            bearing=bearing
        ))

    # Calculate angles between edges
    if len(edges) > 1:
        for i in range(1, len(edges)):
            # first edge has no edge before, angle_change defaults to 0, set in the Edge class
            angle_change = calculate_angle_change(edges[i-1], edges[i])
            edges[i].angle_to_last_edge = angle_change
            
    # return list of edges for one segment
    return edges

def calculate_angle_change(edge1, edge2):
    # Calculate the change in bearing between two edges
    angle_change = edge2.bearing - edge1.bearing
    # Normalize to -180 to +180
    if angle_change > 180:
        angle_change -= 360
    elif angle_change < -180:
        angle_change += 360  
    return angle_change  # Positive for right turns, negative for left turns

def detect_hairpin_curves(edges: List[Edge], look_ahead: float = LOOK_AHEAD_DISTANCE, 
                         angle_threshold: float = CURVE_ANGLE_THRESHOLD) -> List[Edge]:
    # Detect hairpin curves by looking ahead and summing angles
    i = 0
    while i < len(edges):
        cumulative_distance = 0
        cumulative_angle = 0
        j = i
        
        # print(f"\n\nProcessing edge {i} of {len(edges)}")
      
        # Look ahead until we exceed look_ahead distance or reach end
        while j < len(edges) and cumulative_distance < look_ahead:
            cumulative_distance += edges[j].length
            cumulative_angle += edges[j].angle_to_last_edge

            # Check if we've exceeded the angle threshold
            if abs(cumulative_angle) >= angle_threshold:
                # Mark all edges from i to j as hairpin edge
                for k in range(i, j + 1):
                    edges[k].is_hairpin_edge = True
    
                # print(f"**EDGES** from {i} to {j+1} will be hairpin edges")
                # Skip to the end of the current hairpin section
                i = j + 1
                break
            j += 1

        # print(f"current cumulative distance until exceeded: {cumulative_distance}")
        # print(f"cumulative angle until exceeded: {cumulative_angle}")
        
        i += 1

    return edges

def aggregate_sections(edges: List[Edge]) -> List[dict]:
    #Combine consecutive edges of same type (hairpin/no_hairpin) into sections
    sections = []
    current_section = None
    hairpin_id = 0
    nohairpin_id = 0
    
    for edge in edges:
        # Start new section if type changes or this is first edge
        if not current_section or current_section['type'] != ('hairpin' if edge.is_hairpin_edge else 'no_hairpin'):
            # Save previous section if exists
            if current_section:
                sections.append(current_section)
            
            # Start new segment with appropriate ID counter
            if edge.is_hairpin_edge:
                hairpin_id += 1
                section_id = f"H{hairpin_id}"
            else:
                nohairpin_id += 1
                section_id = f"N{nohairpin_id}"
            
            current_section = {
                'id': section_id,
                'type': 'hairpin' if edge.is_hairpin_edge else 'no_hairpin',
                'edges': [],
                'length': 0,
                'total_angle': 0,
                'elevation_change': 0
            }
        
        # Add edge to current section
        current_section['edges'].append(edge)
        current_section['length'] += edge.length
        if edge.angle_to_last_edge:
            current_section['total_angle'] += edge.angle_to_last_edge
        if edge.elev_diff is not None:
            current_section['elevation_change'] += edge.elev_diff
        else:
            current_section['elevation_change'] = None
    
    # Add last section
    if current_section:
        sections.append(current_section)
    
    return sections

def create_hairpin_map(sections: List[dict], gpx_file: str) -> str:
    """Create an HTML map with track and hairpin sections"""
    if not sections:
        return "No track sections found"
    
    # Get points from all sections' edges
    points = []
    for section in sections:
        for edge in section['edges']:
            points.append((edge.point1.latitude, edge.point1.longitude))
        # Add the last point of the last edge in each section
        if section['edges']:
            points.append((section['edges'][-1].point2.latitude, section['edges'][-1].point2.longitude))
    
    # Calculate bounds
    lats = [p[0] for p in points]
    lons = [p[1] for p in points]
    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    
    # Calculate center point for the map
    center_lat = sum(lats) / len(lats)
    center_lon = sum(lons) / len(lons)
    
    # Create map centered on track
    m = folium.Map(location=[center_lat, center_lon])

    folium.PolyLine(points, weight=2, color='blue', opacity=0.8).add_to(m)
    
    # Add hairpin section markers and lines
    hairpin_sections = [section for section in sections if section['type'] == 'hairpin']
    for section in hairpin_sections:
        section_points = []
        for edge in section['edges']:
            section_points.append([edge.point1.latitude, edge.point1.longitude])
        if section['edges']:
            section_points.append([section['edges'][-1].point2.latitude, section['edges'][-1].point2.longitude])
            
        # Add hairpin section line in red
        folium.PolyLine(
            section_points,
            weight=3,
            color='red',
            opacity=0.8
        ).add_to(m)
        
        # Add markers with section ID
        start_point = section['edges'][0].point1
        end_point = section['edges'][-1].point2
        
        folium.Marker(
            [start_point.latitude, start_point.longitude],
            popup=f'Hairpin Section {section["id"]} Start',
            icon=folium.Icon(color='green', icon='info-sign')
        ).add_to(m)
        
        folium.Marker(
            [end_point.latitude, end_point.longitude],
            popup=f'Hairpin Section {section["id"]} End',
            icon=folium.Icon(color='red', icon='info-sign')
        ).add_to(m)
    
    # Fit map to track bounds with some padding
    padding = 0.1  # 10% padding
    lat_padding = (max_lat - min_lat) * padding
    lon_padding = (max_lon - min_lon) * padding
    
    m.fit_bounds(
        [[min_lat - lat_padding, min_lon - lon_padding],
         [max_lat + lat_padding, max_lon + lon_padding]]
    )
    
    # Save map to HTML file
    maps_dir = "Track_Maps"
    if not os.path.exists(maps_dir):
        os.makedirs(maps_dir)
    
    base_filename = os.path.splitext(os.path.basename(gpx_file))[0]
    map_filename = os.path.join(maps_dir, f"{base_filename}_map.html")
    m.save(map_filename)
    
    return map_filename

def generate_markdown_report(gpx_file: str, edges: List[Edge], sections: List[dict]):
    """Generate markdown report for a GPX file"""
    # Create map visualization
    map_file = create_hairpin_map(sections, gpx_file)
    
    # Calculate statistics
    total_length = sum(edge.length for edge in edges)
    
    # Split edges
    hairpin_edges = [e for e in edges if e.is_hairpin_edge]
    no_hairpin_edges = [e for e in edges if not e.is_hairpin_edge]
    
    # Calculate lengths
    hairpin_length = sum(e.length for e in hairpin_edges) if hairpin_edges else 0
    no_hairpin_length = sum(e.length for e in no_hairpin_edges) if no_hairpin_edges else 0
    
    # Check if all edges have elevation data
    has_elevation = all(e.elev_diff is not None for e in edges)
    
    if has_elevation:
        # Total elevation and gradient
        total_elevation = sum(e.elev_diff for e in edges)
        total_gradient = (total_elevation / total_length * 100) if total_length > 0 else 0
        
        # Hairpin elevation and gradient
        hairpin_elevation = sum(e.elev_diff for e in hairpin_edges)
        hairpin_gradient = (hairpin_elevation / hairpin_length * 100) if hairpin_length > 0 else 0
        
        # Straight elevation and gradient
        no_hairpin_elevation = sum(e.elev_diff for e in no_hairpin_edges)
        no_hairpin_gradient = (no_hairpin_elevation / no_hairpin_length * 100) if no_hairpin_length > 0 else 0
        
        grad_str = f"{total_gradient:.1f}%"
        hairpin_grad_str = f"{hairpin_gradient:.1f}%"
        no_hairpin_grad_str = f"{no_hairpin_gradient:.1f}%"
        elev_str = f"{total_elevation:.1f}m"
    else:
        grad_str = "N/A"
        hairpin_grad_str = "N/A"
        no_hairpin_grad_str = "N/A"
        elev_str = "N/A"

    # Generate report
    report = f"""## Track Analysis Report: {gpx_file}

### Track Overview
<iframe src="{map_file}" width="100%" height="400px" frameborder="0"></iframe>

### Overall Statistics
- Total Track Length: {total_length:.1f}m
- Length in No-Hairpin-Sections: {no_hairpin_length:.1f}m ({(no_hairpin_length/total_length*100) if total_length > 0 else 0:.1f}%)
- Length in Hairpin-Sections: {hairpin_length:.1f}m ({(hairpin_length/total_length*100) if total_length > 0 else 0:.1f}%)
- Total Elevation Change: {elev_str}
- Average Track Gradient: {grad_str}
- Average Gradient in No-Hairpin-Sections: {no_hairpin_grad_str}
- Average Gradient in Hairpins: {hairpin_grad_str}


### Section Analysis
| ID | Type | Length (m) | Cum. Turn (°) | Elevation Change (m) | Gradient (%) |
|----|------|------------|---------------|-------------------|------------|
"""
    
    # Add section rows
    for section in sections:
        if section['elevation_change'] is not None and section['length'] > 0:
            elev_change = f"{section['elevation_change']:.1f}"
            gradient = f"{(section['elevation_change'] / section['length'] * 100):.1f}"
        else:
            elev_change = "N/A"
            gradient = "N/A"
            
        report += f"| {section['id']} | {section['type']} | {section['length']:.1f} | {section['total_angle']:.1f} | {elev_change} | {gradient} |\n"
    
    return report

def export_hairpin_points(gpx_file: str, sections: List[dict]):
    """Create a new GPX file with start/end waypoints for hairpin sections"""
    # Create waypoints folder if it doesn't exist
    waypoints_dir = "Hairpin_Waypoints"
    if not os.path.exists(waypoints_dir):
        os.makedirs(waypoints_dir)
    
    # Create new GPX object
    gpx = gpxpy.gpx.GPX()
    
    # Filter for hairpin sections
    hairpin_sections = [section for section in sections if section['type'] == 'hairpin']
    
    if not hairpin_sections:
        print("No hairpin sections found in the track...")
        return None
    
    # For each hairpin section, add start and end points
    for i, section in enumerate(hairpin_sections):
        # Get first edge's point1 (section start)
        first_edge = section['edges'][0]
        start_point = first_edge.point1
        
        # Get last edge's point2 (section end)
        last_edge = section['edges'][-1]
        end_point = last_edge.point2
        
        # Add start waypoint
        start_waypoint = gpxpy.gpx.GPXWaypoint(
            latitude=start_point.latitude,
            longitude=start_point.longitude,
            elevation=start_point.elevation,
            name=f'Hairpin Section {i+1} Start'
        )
        gpx.waypoints.append(start_waypoint)
        
        # Add end waypoint
        end_waypoint = gpxpy.gpx.GPXWaypoint(
            latitude=end_point.latitude,
            longitude=end_point.longitude,
            elevation=end_point.elevation,
            name=f'Hairpin Section {i+1} End'
        )
        gpx.waypoints.append(end_waypoint)
    
    # Create output filename in the waypoints directory
    base_filename = os.path.splitext(os.path.basename(gpx_file))[0]
    output_filename = os.path.join(waypoints_dir, f"{base_filename}_hairpin_sections.gpx")
    
    # Save to file
    with open(output_filename, 'w') as f:
        f.write(gpx.to_xml())
    
    return output_filename

def main():
    # Process all GPX files in current directory
    gpx_files = [f for f in os.listdir('.') if f.endswith('.gpx')]

    if not gpx_files:
        print("\nNo GPX files found in current directory, exiting module!..")
        return

    combined_report = f"""# Combined Track Analysis Report

## Configuration
- **CURVE_ANGLE_THRESHOLD:** {CURVE_ANGLE_THRESHOLD}° (minimum cumulative turn angle to identify a hairpin section)
- **LOOK_AHEAD_DISTANCE:** {LOOK_AHEAD_DISTANCE}m (maximum distance to look ahead for cumulative turns)

## Section Types
- **No-hairpin Sections:** Sections with no hairpin curves, relatively straight sections
- **Hairpin Sections:** Sections with hairpin curves, where turns in the same direction (left or right) accumulate to exceed the angle threshold within the look-ahead distance
- **Turn Angles:** Negative values (-180° to 0°) indicate left turns, positive values (0° to 180°) indicate right turns

---

"""

    print("\ngpx files found in directory:")
    for gpx_file in gpx_files:
        print(f"{gpx_file}")
        
    for gpx_file in gpx_files:
        print(f"\nProcessing {gpx_file}...")

        gpx = gpxpy.parse(open(gpx_file, 'r'))

        # Check how many tracks in one gpx:        
        # Check how many segments in each track:
        if gpx.tracks and gpx.tracks[0].segments and gpx.tracks[0].segments[0].points[0]:
            # Check contents
            t=0
            for track in gpx.tracks:
                t+=1
                s=0
                for segment in track.segments:
                    s+=1
                print(f"Track {t} has {s} segment(s)")
        else:
            #Exit module if gpx track data is faulty
            print("gpx check failed: gpx file does not contain track or track-segments with track points...")    
            return

        # Process points and calculate distances between them
        points = []
        has_elevation = False
        has_time = False
        
        # Check first point for elevation / time data and set <<has_elevation>> <<has_time>>
        if gpx.tracks[0].segments[0].points[0].elevation is not None:
            has_elevation = True

        if gpx.tracks[0].segments[0].points[0].time is not None:
            has_time = True

        print(f"Check 2: Track {'has' if has_elevation else 'does not have'} elevation data")
        print(f"Check 3: Track {'has' if has_time else 'does not have'} time data")

        # iterate over each track and its segments
        # and calculate edges for each track segment
        all_edges = []
        for track in gpx.tracks:
            for segment in track.segments:
                if SMOOTHING:
                    # Apply Chaikin's corner cutting algorithm
                    print(f"Smoothing track will be applied, this will result in more hairpin sections being detected! BUT: Elevation and Time Data will be lost!")
                    segment_points = chaikins_corner_cutting(segment.points, refinements=3)
                else:
                    segment_points = segment.points
                
                # 
                segment_edges = create_edges(segment_points)
                all_edges.extend(segment_edges)

        # check if lengths are correct
        # Get the true track length for later check
        true_length_2d = gpx.length_2d()
        # and compare to summed length of edges
        total_length = sum(edge.length for edge in all_edges)
        print(f"gpx length and summed edges length should match:\n{total_length}\n{true_length_2d}") 

        # Then detect hairpins
        all_edges = detect_hairpin_curves(all_edges)
        
        # Print results
        print(f"\nTotal edges processed: {len(all_edges)}")
        hairpin_edges = [e for e in all_edges if e.is_hairpin_edge]
        print(f"Hairpin edges detected: {len(hairpin_edges)}")
        
        # Continue with existing report generation
        sections = aggregate_sections(all_edges)

        # After hairpin detection and creation of sections
        # Export hairpin points
        output_file = export_hairpin_points(gpx_file, sections)
        print(f"Created hairpin points GPX file: {output_file}")
        report = generate_markdown_report(gpx_file, all_edges, sections)
        
        # Add to combined report with separator
        combined_report += report + "\n---\n\n"
        
        print(f"Processed: {gpx_file}")

    # Save combined report
    with open('combined_track_analysis_report.md', 'w') as f:
        f.write(combined_report)
    
    print(f"\nCombined report generated: combined_track_analysis_report.md")

if __name__ == "__main__":
    main()  
