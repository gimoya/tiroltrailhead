REM sort trails-db and save to GEOJSON
@echo on
cd d:/Projekte/tiroltrailhead/webmap/digitizing/
ogr2ogr -sql "SELECT name, description, geometry FROM 'trails_utm_utf8' ORDER BY name ASC" -f GEOJSON Trails.json trails_utm_utf8.sqlite -s_srs EPSG:900913 -t_srs EPSG:4326

PAUSE