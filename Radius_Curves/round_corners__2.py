import math
import os
import gpxpy
import folium
from dataclasses import dataclass
from typing import List, Optional, Tuple
from datetime import datetime
import numpy as np
import webbrowser
import pyproj

@dataclass
class Point:
    x: float                        # longitude
    y: float                        # latitude
    z: Optional[float] = None     # elevation, optional

def create_arc_points(point1, point2, middle_point, subarc_length=0.5):
    """
    Create points along an arc using middle point and two points on the arc.
    Ensures segments are at least 0.5 units in length.
    """
    # Calculate vectors from middle to points

    # Calculate vectors from middle to points
    v1 = (point1.x - middle_point.x, point1.y - middle_point.y)
    v2 = (point2.x - middle_point.x, point2.y - middle_point.y)
    
    # Radius is just the length of v1 (or v2, they're equal)
    radius = math.sqrt(v1[0]**2 + v1[1]**2)
    
    # Calculate angle between vectors using dot product
    # cos(theta) = dot(v1,v2)/(|v1|*|v2|)
    # Since |v1| = |v2| = radius, we can simplify:
    cos_theta = (v1[0]*v2[0] + v1[1]*v2[1]) / (radius**2)
    angle = math.acos(cos_theta)
    
    # Calculate arc length
    arc_length = radius * angle
    
    # Calculate number of segments needed (arc_length / 0.5 rounded up)
    num_segments = math.ceil(arc_length / subarc_length)
    
    # Create evenly spaced angles
    angles = np.linspace(0, angle, num_segments)
    
    # Calculate rotation matrix to align with first vector
    start_angle = math.atan2(v1[1], v1[0])
    
    # Generate points by rotating and translating
    x = middle_point.x + radius * np.cos(angles + start_angle)
    y = middle_point.y + radius * np.sin(angles + start_angle)

    print(f"Number of segments, with angles: {num_segments}, {angles}°")
    
    return np.column_stack((x, y))

def calculate_corner_points(A: Point, B: Point, C: Point, Radius: float) -> list[]:
    """
    Source: https://stackoverflow.com/questions/24771828/how-to-calculate-rounded-corners-for-a-polygon
    Answer Author: https://stackoverflow.com/users/254343/armen-michaeli
    --
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
    7. Calculate the center point M of the inscribed circle by rotating a radius vector from F
    
    The result is the center point M of the circle that is inscribed between the vectors BA and BC,
    with the circle having the specified radius and being tangent to both vectors.
    """
    # Calculate vectors BA and BC
    BA = (A.x - B.x, A.y - B.y)
    BC = (C.x - B.x, C.y - B.y)
    
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
    
    def add_vectors(v1, v2):
        """Add two vectors"""
        return (v1[0] + v2[0], v1[1] + v2[1])
    
    def rotate_by_90_degrees(v, sign):
        """Rotate a vector by 90 degrees (clockwise or counterclockwise based on sign)"""
        return (-v[1] * sign, v[0] * sign)
    
    # Calculate cosine of angle between BA and BC
    cos_a = cosine_between(BA, BC)

    # catch possible later division by zero errors, due to floating point imprecision that can 
    # lead to cos_a < -1 or cos_a > 1 when angle is close to/exaclty 180 degrees
    if cos_a <= -1:
        cos_a = -0.9999999999999999
    elif cos_a >= 1:
        cos_a = 0.99999999999999999

    # Use the relationship tan(a/2) = sqrt((1-cos(a))/(1+cos(a)))
    tan_half_a = math.sqrt((1 - cos_a) / (1 + cos_a))
    print(f"Angle between BS and BL: {math.degrees(tan_half_a)*2:.0f} degrees")
    # Calculate the length of vector BF using the radius and tangent, which are adjacent and opposite sides to
    # to half of the angle between vectors BA and B, so tan_half_a can be used.
    BF_length = Radius / tan_half_a
    
    # Calculate vector BS_F by scaling the unit vector of the shorter vector of BA and BC -> BS
    # Calculate vector BL_F by scaling the unit vector of the longer vector of BA and BC -> BL
    # Both vectores are symmetric to each other, with the same length, and the bisector of the angle between them
    if length(BA) <= length(BC): 
        # if length is equal, use BA as the shorter vector, cause it does not matter which one is used then
        BS = BA
        BL = BC
    else:
        BS = BC
        BL = BA

    # Calculate opposite of the tangent of half the angle between BS and BL
    # which is the maximum length of the radius that can be used for the corner
    # without the corner point F lying outside the vectors BA or BC
    max_radius_length = length(BS) * tan_half_a
    print(f"Maximum radius length without loosing the original end point of the tangent: {max_radius_length:.5f}")
   

    BSF = scalar_multiply(unit(BS), BF_length)
    BLF = scalar_multiply(unit(BL), BF_length)

    # Check if the length of BF that we get for the given Radius is shorter then BS to retain the 
    # original end point of the vector BS! Exit with an error message if this is not the case!
    # Take the shorter vector from B to F for checking..
    if length(BSF) > length(BS):
        print(f"The length of corner point B to the new arc point F, that we get for the given Radius, is longer than "
              f"the tangent vectors BA or BC (shorter vector of the two is used for checking! "
              f"This would result in a point F that does not lie on the tangent vectors BA or BC...")
        return

    # Calculate sign for rotation using cross product
    # This determines whether to rotate clockwise or counterclockwise
    sign = math.copysign(1, BS[0] * BL[1] - BS[1] * BL[0])
    
    # Calculate point F on both vectors by adding vector BSF and BLF to point B
    F_BS = (B.x + BSF[0], B.y + BSF[1])
    F_BL = (B.x + BLF[0], B.y + BLF[1])
    
    # Calculate middle point M by:
    # 1. Taking a vector of length radius in the direction of BA
    # 2. Rotating it 90 degrees (clockwise or counterclockwise as determined by sign from BS BL Cross Product)
    #   ..would give the same if taking the perpendicular vector of BL and scaling it by Radius, in opposite direction
    # 3. Adding it to point F_BS
    M = add_vectors(F_BS, rotate_by_90_degrees(scalar_multiply(unit(BS), Radius), sign))

    # Return the points A and F_BS, F_BL and C, which will replace the points A, B and C. 
    # B will me missing and needs to be redrawn an arc between the points FA and C
    if BS==BA:  
        # create arc points
        arc_points = create_arc_points(F_BS, F_BL, M, 0.5)
        return [Point(A.x, A.y), Point(F_BS[0], F_BS[1]), Point(F_BL[0], F_BL[1]), Point(C.x, C.y), Point(M[0], M[1])]
    else:
        # create arc points
        arc_points = create_arc_points(F_BL, F_BS, M, 0.5)
        return [Point(A.x, A.y), Point(F_BL[0], F_BL[1]), Point(F_BS[0], F_BS[1]), Point(C.x, C.y), Point(M[0], M[1])]


def create_corner_svg(A: Point, F_BA: Point, F_BC: Point, C: Point, M: Point, radius: float, filename: str = "corner.svg"):
    """Create SVG with lines A-F_BA, F_BC-C and an arc with given radius and M as middle point.
    The arc is drawn from A to C, and the middle point M is the center of the arc."""
    
    # Calculate points range
    points = [(p.x, p.y) for p in [A, F_BA, F_BC, C, M]]  # Store as (x,y)
    min_x = min(p[0] for p in points)
    max_x = max(p[0] for p in points)
    min_y = min(p[1] for p in points)
    max_y = max(p[1] for p in points)
    
    # Calculate center of points
    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    
    # Calculate data ranges
    x_range = max_x - min_x
    y_range = max_y - min_y
    
    # Padding and scaling
    padding = max(radius * 4, max(x_range, y_range) * 0.5)
    target_size = 800  # Target SVG size
    
    # Calculate scale factors for both axes
    scale_x = target_size / (x_range + padding * 2)
    scale_y = target_size / (y_range + padding * 2)
    
    # Use the smaller scale to maintain aspect ratio
    scale = min(scale_x, scale_y)
    
    # SVG dimensions
    svg_width = (x_range + padding * 2) * scale
    svg_height = (y_range + padding * 2) * scale
    
    # Calculate viewBox dimensions to center the drawing
    view_width = svg_width
    view_height = svg_height
    view_x = -view_width / 2   # Center horizontally
    view_y = -view_height / 2  # Center vertically
    
    def transform_point(p):
        """Transform (x,y) coordinates to SVG space with origin at (0,0)"""
        # Center the coordinates around (0,0)
        x = (p[0] - (min_x + max_x) / 2) * scale
        y = -(p[1] - (min_y + max_y) / 2) * scale  # Negate y because SVG y grows downward
        return x, y
    
    # Transform points to SVG coordinates
    A_svg = transform_point((A.x, A.y))
    F_BA_svg = transform_point((F_BA.x, F_BA.y))
    F_BC_svg = transform_point((F_BC.x, F_BC.y))
    C_svg = transform_point((C.x, C.y))
    M_svg = transform_point((M.x, M.y))
    
    # Calculate arc parameters
    BA = (A.x - F_BA.x, A.y - F_BA.y)
    BC = (C.x - F_BC.x, C.y - F_BC.y)
    sweep = 1 if (BA[0] * BC[1] - BA[1] * BC[0]) > 0 else 0
    
    # Calculate meaningful increments for axes
    def calculate_increment(range_value):
        """Calculate a meaningful increment based on the range"""
        # Get the order of magnitude of the range
        magnitude = math.floor(math.log10(range_value))
        # Base increment is 10^magnitude
        base = 10 ** magnitude
        # Adjust increment based on range
        if range_value / base < 2:
            return base / 5
        elif range_value / base < 5:
            return base / 2
        else:
            return base
    
    x_increment = calculate_increment(x_range)
    y_increment = calculate_increment(y_range)
    
    # Calculate grid lines
    def create_axis_markers():
        markers = []
        # X-axis markers
        x_start = math.floor(min_x / x_increment) * x_increment
        x_end = math.ceil(max_x / x_increment) * x_increment
        for x in np.arange(x_start, x_end + x_increment, x_increment):
            x_svg = transform_point((x, 0))[0]
            markers.append(f'<line x1="{x_svg}" y1="-10000" x2="{x_svg}" y2="10000" stroke="#eee"/>')
            markers.append(f'<text x="{x_svg}" y="20" text-anchor="middle" fill="#666">{x:.1f}</text>')
        
        # Y-axis markers
        y_start = math.floor(min_y / y_increment) * y_increment
        y_end = math.ceil(max_y / y_increment) * y_increment
        for y in np.arange(y_start, y_end + y_increment, y_increment):
            y_svg = transform_point((0, y))[1]
            markers.append(f'<line x1="-10000" y1="{y_svg}" x2="10000" y2="{y_svg}" stroke="#eee"/>')
            markers.append(f'<text x="-20" y="{y_svg}" text-anchor="end" fill="#666">{y:.1f}</text>')
        
        return '\n'.join(markers)
    
    svg = f"""<svg width="{svg_width}" height="{svg_height}" 
              viewBox="{view_x} {view_y} {view_width} {view_height}" 
              xmlns="http://www.w3.org/2000/svg">
    <!-- Grid and Axis Markers -->
    <g stroke="#eee" stroke-width="0.5">
        <line x1="-10000" y1="0" x2="10000" y2="0" stroke="#999"/>
        <line x1="0" y1="-10000" x2="0" y2="10000" stroke="#999"/>
        {create_axis_markers()}
    </g>
    
    <!-- Original lines -->
    <g stroke="black" stroke-width="1">
        <line x1="{F_BA_svg[0]}" y1="{F_BA_svg[1]}" x2="{A_svg[0]}" y2="{A_svg[1]}" stroke="#666"/>
        <line x1="{F_BC_svg[0]}" y1="{F_BC_svg[1]}" x2="{C_svg[0]}" y2="{C_svg[1]}" stroke="#666"/>
    </g>
    
    <!-- Arc -->
    <path d="M {F_BA_svg[0]},{F_BA_svg[1]} 
             A {radius * scale},{radius * scale} 0 0,{sweep} {F_BC_svg[0]},{F_BC_svg[1]}"
          fill="none" stroke="red" stroke-width="1" stroke-dasharray="2"/>
    
    <!-- Points -->
    <g>
        <circle cx="{A_svg[0]}" cy="{A_svg[1]}" r="3" fill="blue"/>
        <circle cx="{F_BA_svg[0]}" cy="{F_BA_svg[1]}" r="3" fill="green"/>
        <circle cx="{F_BC_svg[0]}" cy="{F_BC_svg[1]}" r="3" fill="green"/>
        <circle cx="{C_svg[0]}" cy="{C_svg[1]}" r="3" fill="blue"/>
        <circle cx="{M_svg[0]}" cy="{M_svg[1]}" r="3" fill="red"/>
        
        <text x="{A_svg[0]-10}" y="{A_svg[1]-10}" fill="blue">A</text>
        <text x="{F_BA_svg[0]-10}" y="{F_BA_svg[1]+20}" fill="green">F_BA</text>
        <text x="{F_BC_svg[0]+10}" y="{F_BC_svg[1]-10}" fill="green">F_BC</text>
        <text x="{C_svg[0]+10}" y="{C_svg[1]-10}" fill="blue">C</text>
        <text x="{M_svg[0]+5}" y="{M_svg[1]-5}" fill="red">M</text>
    </g>
    </svg>"""
    
    with open(filename, 'w') as f:
        f.write(svg)
    
    print(f"SVG visualization saved to {filename}")
    
    return filename

# Reproject all points to Web Mercator
def reproject_point(p:Point) -> Point:
     # Create transformer for coordinate conversion
    transformer = pyproj.Transformer.from_crs("epsg:4326", "epsg:3857", always_xy=True)
    e  = p.z
    x, y = transformer.transform(p.x, p.y)  # Note: transform takes (lon, lat)
    return Point(x, y, e)

def main():
    # take an example gpx from root and parse to points using the gpxpy library and our point class fromine line 14
    # with lon lat and elevation    
    gpx_file = "corner_test.gpx"

    # parse the gpx file
    with open(gpx_file, 'r') as f:
        gpx = gpxpy.parse(f)

    # get the first track and segment and points
    gpx_points = gpx.tracks[0].segments[0].points

    points = [Point(p.longitude, p.latitude, p.elevation) for p in gpx_points]

    # convert to projected coordinates
    rp_points = [reproject_point(p) for p in points]


    # make a set of points for testing the function
    point_A = rp_points[0]
    point_B = rp_points[1]
    point_C = rp_points[2]

    print(f"{point_A}")
    print(f"{point_B}")
    print(f"{point_C}")

    # make simpler set of points for debugging
    point_A = Point(3, 10)
    point_B = Point(1, 2)
    point_C = Point(20, 2)
    
    
    Radius = 2

    # calculate the middle point of the corner
    corner_points = calculate_corner_points(point_A, point_B, point_C, Radius)
    print(f"{corner_points}")
    
    # create the svg file
    create_corner_svg(corner_points[0], corner_points[1], corner_points[2], corner_points[3], corner_points[4], Radius)
    
    # open in browser
    webbrowser.open("corner.svg")

if __name__ == "__main__":
    main()

