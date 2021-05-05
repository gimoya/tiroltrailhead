REM sort trails-db and save to KML
@echo on
cd C:/Users/Kay/tiroltrail-webmap/digitizing
ogr2ogr -sql "SELECT * FROM 'regions_utm_utf8' ORDER BY Name ASC" -f "KML" Regions.kml regions_utm_utf8.sqlite -s_srs EPSG:900913 -t_srs EPSG:4326
ogr2ogr -sql "SELECT * FROM 'PRO_regions_utm_utf8' ORDER BY Name ASC" -f "KML" Pro_Regions.kml PRO_regions_utm_utf8.sqlite -s_srs EPSG:900913 -t_srs EPSG:4326
@echo off

PAUSE