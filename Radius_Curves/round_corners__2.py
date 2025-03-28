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
import matplotlib.pyplot as plt

@dataclass
class Point:
    x: float                        # longitude
    y: float                        # latitude
    z: Optional[float] = None     # elevation, optional

def create_arc_points(point1: Point, point2: Point, middle_point: Point, subarc_length: float = 0.1) -> np.ndarray:
    """
    Create points along an arc using middle point and two points on the arc.
    """
    # Calculate vectors from middle to points
    v1 = (point1.x - middle_point.x, point1.y - middle_point.y)
    v2 = (point2.x - middle_point.x, point2.y - middle_point.y)
    # Radius is just the length of v1 (or v2, they're equal)
    radius = math.sqrt(v1[0]**2 + v1[1]**2)
    # Calculate angle between vectors using dot product
    cos_theta = (v1[0]*v2[0] + v1[1]*v2[1]) / (radius**2)
    # Calculate cross product to determine direction
    cross_z = v1[0]*v2[1] - v1[1]*v2[0]
    # Get base angle
    angle = math.acos(cos_theta)
    # we want the shorter arc:
    if angle > math.pi:
        angle = 2*math.pi - angle
    # Store direction
    direction = -1 if cross_z < 0 else 1
    # Calculate arc length using absolute angle
    arc_length = radius * abs(angle)
    # Calculate number of segments based on the subarc length
    num_points = math.ceil(arc_length / subarc_length)
    # Calculate rotation matrix to align with first vector
    start_angle = math.atan2(v1[1], v1[0])
    # Create evenly spaced angles for the correct arc portion, applying direction
    angles = np.linspace(0, direction * angle, num_points)
    
    # Generate points by rotating and translating
    x = middle_point.x + radius * np.cos(angles + start_angle)
    y = middle_point.y + radius * np.sin(angles + start_angle)

    return [Point(p[0], p[1]) for p in np.column_stack((x, y))]

def calculate_corner_points(A: Point, B: Point, C: Point, Radius: float, subarc_length: float = 0.1, verbose: bool = True) -> list[Point]:
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

    All vectors are treated as Point objects with x and y coordinates.
    """
    # Calculate vectors BA and BC
    BA = Point(A.x - B.x, A.y - B.y)
    BC = Point(C.x - B.x, C.y - B.y)
    
    # Helper functions for vector operations
    def length(v):
        """Calculate the length of a vector"""
        return math.sqrt(v.x * v.x + v.y * v.y)
    
    def dot_product(v1, v2):
        """Calculate the dot product of two vectors"""
        return v1.x * v2.x + v1.y * v2.y
    
    def cosine_between(v1, v2):
        """Calculate the cosine of the angle between two vectors using dot product"""
        return dot_product(v1, v2) / (length(v1) * length(v2))
    
    def unit(v):
        """Convert a vector to its unit vector (normalized)"""
        l = length(v)
        return Point(v.x / l, v.y / l)
    
    def scalar_multiply(v, n):
        """Multiply a vector by a scalar"""
        return Point(v.x * n, v.y * n)
    
    def add_vectors(v1, v2):
        """Add two vectors"""
        return Point(v1.x + v2.x, v1.y + v2.y)
    
    def rotate_by_90_degrees(v, sign):
        """Rotate a vector by 90 degrees (clockwise or counterclockwise based on sign)"""
        return Point(-v.y * sign, v.x * sign)
    
    # Calculate cosine of angle between BA and BC
    cos_a = cosine_between(Point(BA.x, BA.y), Point(BC.x, BC.y))

    # catch possible later division by zero errors, due to floating point imprecision that can 
    # lead to cos_a < -1 or cos_a > 1 when angle is close to/exaclty 180 degrees
    if cos_a <= -1:
        cos_a = -0.9999999999999999
    elif cos_a >= 1:
        cos_a = 0.99999999999999999

    # Use the relationship tan(a/2) = sqrt((1-cos(a))/(1+cos(a))) to calculate the tangent of half of the 
    # angle between vectors BA and BC
    # check if the angle is close to 180 degrees, to avoid division by zero
    if abs(cos_a) >= 0.9999999999999999:
        tan_half_a = 0 # if the angle is 180 degrees, the tangent of half of the angle is 0
        print(f"Angle between BS and BL: is 0 degrees! Check the input points for colinearity!"
              f"..the original points are returned")
        return [A, B, C]
    # if the angle is not 180 degrees, calculate the tangent of half of the angle
    tan_half_a = math.sqrt((1 - cos_a) / (1 + cos_a))

    # Calculate the length of vector BF using the radius and tangent, which are adjacent and opposite sides to
    # to half of the angle between vectors BA and B, so tan_half_a can be used.
    BF_length = Radius / tan_half_a
    
    # Calculate vector BS_F by scaling the unit vector of the shorter vector of BA and BC -> BS
    # Calculate vector BL_F by scaling the unit vector of the longer vector of BA and BC -> BL
    # Both vectores are symmetric to each other, with the same length, and the bisector of the angle between them
    if length(Point(BA.x, BA.y)) <= length(Point(BC.x, BC.y)): 
        # if length is equal, use BA as the shorter vector, cause it does not matter which one is used then
        BS = Point(BA.x, BA.y)
        BL = Point(BC.x, BC.y)
    else:
        BS = Point(BC.x, BC.y)
        BL = Point(BA.x, BA.y)

    # Calculate opposite of the tangent of half the angle between BS and BL
    # which is the maximum length of the radius that can be used for the corner
    # without the corner point F lying outside the vectors BA or BC
    max_radius_length = length(BS) * tan_half_a   

    BSF = scalar_multiply(unit(BS), BF_length)
    BLF = scalar_multiply(unit(BL), BF_length)

    # Check if the length of BF that we get for the given Radius is shorter then BS to retain the 
    # original end point of the vector BS! Exit with an error message if this is not the case!
    # Take the shorter vector from B to F for checking..
    if length(BSF) > length(BS):
        if verbose:
            print(f"The length of corner point B to the new arc point F, that we get for the given Radius,\n"
                  f"is longer than the tangent vectors BA or BC (shorter vector of the two is used for checking!\n"
              f"This would result in a point F that does not lie on the tangent vectors BA or BC...\n\n"
              f"Maximum radius length without loosing the original end point of the tangent: {max_radius_length:.3f}\n"
              f"Angle between BS and BL: {math.degrees(tan_half_a)*2:.0f} degrees"
              f"..the original points are returned")
        return [A, B, C]

    # Calculate sign for rotation using cross product
    # This determines whether to rotate clockwise or counterclockwise
    sign = math.copysign(1, BS.x * BL.y - BS.y * BL.x)
    
    # Calculate point F on both vectors by adding vector BSF and BLF to point B
    F_BS = add_vectors(B, BSF)
    F_BL = add_vectors(B, BLF)
    
    # Calculate middle point M by:
    # 1. Taking a vector of length radius in the direction of BA
    # 2. Rotating it 90 degrees (clockwise or counterclockwise as determined by sign from BS BL Cross Product)
    #   ..would give the same if taking the perpendicular vector of BL and scaling it by Radius, in opposite direction
    # 3. Adding it to point F_BS
    M = add_vectors(F_BS, rotate_by_90_degrees(scalar_multiply(unit(BS), Radius), sign))

    # Return the points A and F_BS/F_BL and C. B  will be replaced by the new arc points between the points F_BS and F_BL
    # Check if BS and BA are the same vector, to determine the direction of the arc
    if BS == BA:  
        # create arc points
        arc_points = create_arc_points(F_BS, F_BL, M, subarc_length)
        # print(f"BA is the shorter vector, so we draw the arc from F_BS to F_BL")
    else:
        # create arc points
        arc_points = create_arc_points(F_BL, F_BS, M, subarc_length)
        # print(f"BC is the shorter vector, so we draw the arc from F_BL to F_BS")
    
    return [Point(A.x, A.y)] + [Point(p.x, p.y) for p in arc_points] + [Point(C.x, C.y)]

# Reproject all points to Web Mercator
def reproject_point(p:Point) -> Point:
     # Create transformer for coordinate conversion
    transformer = pyproj.Transformer.from_crs("epsg:4326", "epsg:3857", always_xy=True)
    e  = p.z
    x, y = transformer.transform(p.x, p.y)  # Note: transform takes (lon, lat)
    return Point(x, y, e)

def plot_points(og_points: list[Point], new_points: list[Point], radius: float):
    """Plot original and new points using matplotlib"""
    plt.figure(figsize=(10, 10))
    
    # Plot original points and lines (thicker, red)
    og_x = [p.x for p in og_points]
    og_y = [p.y for p in og_points]
    plt.plot(og_x, og_y, 'r-o', label='Original', linewidth=3, markersize=10, zorder=1)
    
    # Plot new points and lines (thinner, blue, on top)
    new_x = [p.x for p in new_points]
    new_y = [p.y for p in new_points]
    plt.plot(new_x, new_y, 'b-o', label='New', linewidth=1, markersize=5, zorder=2)
    
    # Add labels
    plt.grid(True)
    plt.axis('equal')
    plt.title(f'Corner Rounding (Radius={radius})')
    plt.legend()
    
    # Add point labels
    for i, (x, y) in enumerate(zip(og_x, og_y)):
        plt.annotate(f'P{i+1}', (x, y), xytext=(5, 5), textcoords='offset points', color='red')
    
    for i, (x, y) in enumerate(zip(new_x, new_y)):
        plt.annotate(f'P{i+1}', (x, y), xytext=(15, 15), textcoords='offset points', color='blue')
    
    plt.show()

def main():
    # set of points for debugging
    point_A = Point(0, 5)
    point_B = Point(0, 0)
    point_C = Point(0, 14)
    og_points = [point_A, point_B, point_C]
    
    Radius = 1.5
    Subarc_Length = 0.2
    # calculate new points with rounded corner points
    corner_points = calculate_corner_points(point_A, point_B, point_C, Radius, Subarc_Length, verbose=False)
    
    # plot points using matplotlib
    plot_points(og_points, corner_points, Radius)

if __name__ == "__main__":
    main()

