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
- Total Elevation Change: -342.1m
- Average Track Gradient: -11.8%
- Average Gradient in No-Hairpin-Sections: -11.1%
- Average Gradient in Hairpins: -25.8%


### Section Analysis
| ID | Type | Length (m) | Cum. Turn (&deg;) | Elevation Change (m) | Gradient (%) |
|----|------|------------|---------------|-------------------|------------|
| N1 | no_hairpin | 417.0 | -83.0 | -43.1 | -10.3 |
| H1 | hairpin | 13.4 | -156.2 | -4.3 | -31.8 |
| N2 | no_hairpin | 854.2 | 203.7 | -103.0 | -12.1 |
| H2 | hairpin | 12.2 | -150.5 | -2.8 | -23.3 |
| N3 | no_hairpin | 20.2 | -17.8 | -2.4 | -12.0 |
| H3 | hairpin | 14.0 | 151.3 | -3.4 | -24.2 |
| N4 | no_hairpin | 29.1 | 15.4 | 0.6 | 2.2 |
| H4 | hairpin | 16.0 | -152.3 | -3.1 | -19.4 |
| N5 | no_hairpin | 41.9 | 0.0 | -7.8 | -18.7 |
| H5 | hairpin | 17.3 | 162.1 | -3.3 | -19.1 |
| N6 | no_hairpin | 45.2 | 1.9 | 4.1 | 9.1 |
| H6 | hairpin | 15.4 | -152.8 | -3.8 | -24.8 |
| N7 | no_hairpin | 34.8 | -9.1 | -6.3 | -18.2 |
| H7 | hairpin | 13.3 | 155.8 | -3.4 | -25.9 |
| N8 | no_hairpin | 243.6 | 28.4 | -10.5 | -4.3 |
| H8 | hairpin | 13.0 | -152.2 | -5.0 | -38.3 |
| N9 | no_hairpin | 112.0 | -12.7 | -8.6 | -7.6 |
| H9 | hairpin | 13.9 | 151.5 | -4.0 | -28.7 |
| N10 | no_hairpin | 984.2 | -160.6 | -132.0 | -13.4 |

---

