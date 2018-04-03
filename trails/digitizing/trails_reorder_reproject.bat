REM sort trails-db and save to KML
@echo on
cd C:/Users/Kay/tiroltrail-webmap/digitizing/
ogr2ogr -sql "SELECT name, description, geometry FROM 'trails_utm_utf8' ORDER BY name ASC" -f KML Trails.kml trails_utm_utf8.sqlite -s_srs EPSG:900913 -t_srs EPSG:4326

PAUSE