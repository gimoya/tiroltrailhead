import math
import os
import gpxpy

# Global configuration parameters
LOOK_AHEAD_DISTANCE = 25  # meters
CURVE_ANGLE_THRESHOLD = 135  # degrees

def calculate_distance(point1, point2):
    # Create gpxpy points for distance calculation
    p1 = gpxpy.gpx.GPXTrackPoint(point1['latitude'], point1['longitude'])
    p2 = gpxpy.gpx.GPXTrackPoint(point2['latitude'], point2['longitude'])
    return p1.distance_2d(p2)

def calculate_bearing(lat1, lon1, lat2, lon2):
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Calculate bearing
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    bearing = math.atan2(y, x)
    
    # Convert to degrees
    return math.degrees(bearing)

def calculate_angle_change(p1, p2, p3):
    # Calculate bearings for both segments
    bearing1 = calculate_bearing(p1['latitude'], p1['longitude'], 
                               p2['latitude'], p2['longitude'])
    bearing2 = calculate_bearing(p2['latitude'], p2['longitude'], 
                               p3['latitude'], p3['longitude'])
    
    # Calculate the change in bearing
    angle_change = bearing2 - bearing1
    
    # Normalize to -180 to +180
    if angle_change > 180:
        angle_change -= 360
    elif angle_change < -180:
        angle_change += 360
    
    return angle_change  # Positive for right turns, negative for left turns

def combine_segments_by_curvature(points, curve_angle_threshold=CURVE_ANGLE_THRESHOLD, look_ahead_distance=LOOK_AHEAD_DISTANCE):
    print("Starting curve detection...")
    combined = []
    i = 0
    straight_points = [points[0]]
    
    while i < len(points) - 2:
        print(f"Processing point {i} of {len(points)}")
        
        cumulative_distance = 0
        total_angle = 0
        j = i + 1
        
        while j < len(points) - 2 and cumulative_distance < look_ahead_distance:
            # Angle changes and distance are accumulated
            angle = calculate_angle_change(points[j-1], points[j], points[j+1])
            total_angle += angle
            cumulative_distance += points[j]['distance']
            
            # Check if we've accumulated enough angle change in either direction
            if abs(total_angle) >= curve_angle_threshold:
                # Found a curve - add any collected straight points first
                if straight_points:
                    total_distance = sum(p['distance'] for p in straight_points[1:])
                    straight_segment = {
                        'start_point': straight_points[0],
                        'end_point': straight_points[-1],
                        'distance': total_distance,
                        'elevation_change': straight_points[-1]['elevation'] - straight_points[0]['elevation'],
                        'points': straight_points.copy(),
                        'type': 'straight',
                        'gradient': ((straight_points[-1]['elevation'] - straight_points[0]['elevation']) / 
                                   total_distance * 100) if total_distance > 0 else 0
                    }
                    combined.append(straight_segment)
                    straight_points = []
                
                # Add the curve segment
                curve_points = [points[k] for k in range(i, j + 1)]
                curve_distance = sum(points[k]['distance'] for k in range(i + 1, j + 1))
                
                curve_segment = {
                    'start_point': points[i],
                    'end_point': points[j],
                    'distance': curve_distance,
                    'elevation_change': points[j]['elevation'] - points[i]['elevation'],
                    'points': curve_points,
                    'type': 'curve',
                    'cumulative_angle': abs(total_angle),
                    'turn_direction': 'right' if total_angle > 0 else 'left',
                    'gradient': ((points[j]['elevation'] - points[i]['elevation']) / 
                               curve_distance * 100) if curve_distance > 0 else 0
                }
                combined.append(curve_segment)
                i = j
                straight_points = [points[j]]
                break
            
            j += 1
        
        if abs(total_angle) < curve_angle_threshold:
            if i < len(points) - 1:
                straight_points.append(points[i+1])
            i += 1
    
    # Add remaining straight points
    if straight_points:
        total_distance = sum(p['distance'] for p in straight_points[1:])
        if total_distance > 0:
            straight_segment = {
                'start_point': straight_points[0],
                'end_point': straight_points[-1],
                'distance': total_distance,
                'elevation_change': straight_points[-1]['elevation'] - straight_points[0]['elevation'],
                'points': straight_points,
                'type': 'straight',
                'gradient': ((straight_points[-1]['elevation'] - straight_points[0]['elevation']) / 
                           total_distance * 100) if total_distance > 0 else 0
            }
            combined.append(straight_segment)
    
    print("Finished curve detection")
    return combined
    
def analyze_gpx(gpx_file):
    with open(gpx_file, 'r') as f:
        gpx = gpxpy.parse(f)

    # Get the true track length
    true_length_2d = gpx.length_2d()
    
    # Process points and calculate distances between them
    points = []
    has_elevation = True
    
    # Check first point for elevation data
    if gpx.tracks and gpx.tracks[0].segments and gpx.tracks[0].segments[0].points:
        first_point = gpx.tracks[0].segments[0].points[0]
        has_elevation = first_point.elevation is not None
    
    print(f"Track {'has' if has_elevation else 'does not have'} elevation data")
    
    for track in gpx.tracks:
        for segment in track.segments:
            # First, collect all points without distances
            track_points = []
            for point in segment.points:
                point_data = {
                    'latitude': point.latitude,
                    'longitude': point.longitude,
                    'distance': 0
                }
                
                # Only include elevation if available
                if has_elevation:
                    point_data['elevation'] = point.elevation
                else:
                    point_data['elevation'] = 0  # Use 0 as default elevation
                
                track_points.append(point_data)
            
            # Calculate distances as before
            for i in range(len(track_points)):
                if i > 0:
                    p1 = gpxpy.gpx.GPXTrackPoint(
                        track_points[i-1]['latitude'], 
                        track_points[i-1]['longitude'],
                        elevation=track_points[i-1]['elevation'] if has_elevation else None
                    )
                    p2 = gpxpy.gpx.GPXTrackPoint(
                        track_points[i]['latitude'], 
                        track_points[i]['longitude'],
                        elevation=track_points[i]['elevation'] if has_elevation else None
                    )
                    track_points[i]['distance'] = p1.distance_2d(p2)
            
            points.extend(track_points)

    # Continue with segment analysis...
    segments = combine_segments_by_curvature(points)
    
    # Calculate statistics
    curve_segments = [s for s in segments if s['type'] == 'curve']
    straight_segments = [s for s in segments if s['type'] == 'straight']
    
    curve_distance = sum(s['distance'] for s in curve_segments)
    straight_distance = sum(s['distance'] for s in straight_segments)

    # Verify distances
    calculated_total = sum(p['distance'] for p in points)
    
    result = {
        'filename': os.path.basename(gpx_file),
        'total_distance': true_length_2d,
        'curve_distance': curve_distance,
        'straight_distance': straight_distance,
        'curve_percentage': (curve_distance / true_length_2d * 100) if true_length_2d > 0 else 0,
        'segments': segments,
        'curve_count': len(curve_segments),
        'straight_count': len(straight_segments),
        'has_elevation': has_elevation
    }
    
    # Only include elevation stats if elevation data is available
    if has_elevation:
        result.update({
            'total_elevation_gain': sum(max(0, s['elevation_change']) for s in segments),
            'total_elevation_loss': abs(sum(min(0, s['elevation_change']) for s in segments))
        })
    
    return result
    
def generate_report(analysis_results, output_file):
    with open(output_file, 'w') as f:
        f.write("# Track Analysis Report (Curve-based)\n\n")
        
        # Add curve detection parameters info
        f.write("## Analysis Parameters\n")
        f.write("Curve detection is based on the following parameters:\n")
        f.write(f"- Look-ahead distance: {LOOK_AHEAD_DISTANCE} meters\n")
        f.write(f"- Curve angle threshold: {CURVE_ANGLE_THRESHOLD} degrees\n")
        f.write("- A curve is detected when the cumulative angle within the look-ahead distance exceeds the threshold\n")
        f.write("- Angles are only accumulated when consecutive turns are in the same direction\n\n")
        f.write("---\n\n")
        
        for result in analysis_results:
            f.write(f"## {result['filename']}\n\n")
            f.write("### Overall Statistics\n\n")
            f.write(f"- Total Distance: {result['total_distance']:.1f} m\n")
            f.write(f"- Distance in Curves: {result['curve_distance']:.1f} m ({result['curve_percentage']:.1f}%)\n")
            f.write(f"- Distance in Straight Sections: {result['straight_distance']:.1f} m\n")
            f.write(f"- Number of Curves: {result['curve_count']}\n")
            f.write(f"- Number of Straight Sections: {result['straight_count']}\n")
            f.write(f"- Check Sum of Straight + Curve Sections: {result['straight_distance'] + result['curve_distance']:.1f} m\n")
            
            # Only include elevation stats if available
            if result['has_elevation']:
                f.write(f"- Total Elevation Gain: {result['total_elevation_gain']:.1f} m\n")
                f.write(f"- Total Elevation Loss: {result['total_elevation_loss']:.1f} m\n")
            else:
                f.write("- No elevation data available\n")
                
            f.write("### Segment Analysis\n\n")
            f.write("| Type | Direction | Start Distance (m) | End Distance (m) | Length (m) | Elevation Change (m) | Gradient (%) | Curve Angle (&deg;) |\n")
            f.write("|------|-----------|-------------------|-----------------|------------|-------------------|-------------|----------------|\n")
            
            cumulative_distance = 0
            for segment in result['segments']:
                direction = segment.get('turn_direction', 'N/A')
                curve_angle = f"{segment.get('cumulative_angle', 0):.1f}" if segment['type'] == 'curve' else 'N/A'
                segment_length = segment['distance']
                
                f.write(
                    f"| {segment['type']} | {direction} | "
                    f"{cumulative_distance:.1f} | {(cumulative_distance + segment_length):.1f} | "
                    f"{segment_length:.1f} | {segment['elevation_change']:.1f} | "
                    f"{segment['gradient']:.1f} | {curve_angle} |\n"
                )
                
                cumulative_distance += segment_length
            
            f.write("\n---\n\n")

def export_segments_to_gpx(segments, original_filename):
    # Create output directory
    base_name = os.path.splitext(original_filename)[0]
    output_dir = f"{base_name}_segments"
    os.makedirs(output_dir, exist_ok=True)
    
    # Create GPX files for curves and straights
    curves_gpx = gpxpy.gpx.GPX()
    straights_gpx = gpxpy.gpx.GPX()
    
    # Add points to respective GPX files
    for segment in segments:
        for i, point in enumerate(segment['points']):
            gpx_point = gpxpy.gpx.GPXWaypoint(
                latitude=point['latitude'],
                longitude=point['longitude'],
                elevation=point['elevation'],
                name=f"{segment['type']}_{i+1}"
            )
            if segment['type'] == 'curve':
                curves_gpx.waypoints.append(gpx_point)
            else:
                straights_gpx.waypoints.append(gpx_point)
    
    # Save combined GPX files
    with open(os.path.join(output_dir, "curves.gpx"), 'w') as f:
        f.write(curves_gpx.to_xml())
    
    with open(os.path.join(output_dir, "straights.gpx"), 'w') as f:
        f.write(straights_gpx.to_xml())
    
    print(f"Exported combined segments to {output_dir}/")

def main():
    # Process all GPX files in current directory
    gpx_files = [f for f in os.listdir('.') if f.endswith('.gpx')]
    
    if not gpx_files:
        print("No GPX files found in current directory")
        return
    
    analysis_results = []
    for gpx_file in gpx_files:
        print(f"\n\nProcessing {gpx_file}...\n")
        result = analyze_gpx(gpx_file)
        analysis_results.append(result)
        # Export segments to separate GPX files
        export_segments_to_gpx(result['segments'], gpx_file)
    
    # Generate report
    generate_report(analysis_results, 'track_analysis_curves_report.md')
    print("Analysis complete. Results written to track_analysis_curves_report.md")

if __name__ == "__main__":
    main()  