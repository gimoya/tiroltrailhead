# Combined Track Analysis Report

## Configuration
- **CURVE_ANGLE_THRESHOLD:** 150&deg; (minimum cumulative turn angle to identify a hairpin section)
- **LOOK_AHEAD_DISTANCE:** 15m (maximum distance to look ahead for cumulative turns)

## Section Types
- **No-hairpin Sections:** Sections with no hairpin curves, relatively straight sections
- **Hairpin Sections:** Sections with hairpin curves, where turns in the same direction (left or right) accumulate to exceed the angle threshold within the look-ahead distance
- **Turn Angles:** Negative values (-180&deg; to 0&deg;) indicate left turns, positive values (0&deg; to 180&deg;) indicate right turns

---

## Track Analysis Report: trasse_neu.gpx

### Track Overview
<iframe src="Track_Maps\trasse_neu_map.html" width="100%" height="400px" frameborder="0"></iframe>

### Overall Statistics
- Total Track Length: 2910.7m
- Length in No-Hairpin-Sections: 2782.2m (95.6%)
- Length in Hairpin-Sections: 128.6m (4.4%)
- Total Elevation Change: N/A
- Average Track Gradient: N/A
- Average Gradient in No-Hairpin-Sections: N/A
- Average Gradient in Hairpins: N/A


### Section Analysis
| ID | Type | Length (m) | Cum. Turn (&deg;) | Elevation Change (m) | Gradient (%) |
|----|------|------------|---------------|-------------------|------------|
| N1 | no_hairpin | 417.0 | -83.0 | N/A | N/A |
| H1 | hairpin | 13.4 | -156.2 | N/A | N/A |
| N2 | no_hairpin | 854.2 | 203.7 | N/A | N/A |
| H2 | hairpin | 12.2 | -150.5 | N/A | N/A |
| N3 | no_hairpin | 20.2 | -17.8 | N/A | N/A |
| H3 | hairpin | 14.0 | 151.3 | N/A | N/A |
| N4 | no_hairpin | 29.1 | 15.4 | N/A | N/A |
| H4 | hairpin | 16.0 | -152.3 | N/A | N/A |
| N5 | no_hairpin | 41.9 | 0.0 | N/A | N/A |
| H5 | hairpin | 17.3 | 162.1 | N/A | N/A |
| N6 | no_hairpin | 45.2 | 1.9 | N/A | N/A |
| H6 | hairpin | 15.4 | -152.8 | N/A | N/A |
| N7 | no_hairpin | 34.8 | -9.1 | N/A | N/A |
| H7 | hairpin | 13.3 | 155.8 | N/A | N/A |
| N8 | no_hairpin | 243.6 | 28.4 | N/A | N/A |
| H8 | hairpin | 13.0 | -152.2 | N/A | N/A |
| N9 | no_hairpin | 112.0 | -12.7 | N/A | N/A |
| H9 | hairpin | 13.9 | 151.5 | N/A | N/A |
| N10 | no_hairpin | 984.2 | -160.6 | N/A | N/A |

---

