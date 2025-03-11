#!/bin/bash
#sort trails-db and save to KML

echo -e "\n---\n  Export trails to KML, reproject, reorder Trails- and Regions-KMLs before pushing to GitHub?\n  Hit y/n + [Enter]:"
read yesno
if [ "$yesno" = "y" ] 
then
	cd ~
	cd d:/Projekte/tiroltrailhead/webmap/digitizing/
	ogr2ogr -sql "SELECT name, description, geometry FROM 'trails_utm_utf8' ORDER BY name ASC" -f KML Trails.kml trails_utm_utf8.sqlite -s_srs EPSG:900913 -t_srs EPSG:4326
	ogr2ogr -sql "SELECT * FROM 'regions_utm_utf8' ORDER BY Name ASC" -f "KML" Regions.kml regions_utm_utf8.sqlite -s_srs EPSG:900913 -t_srs EPSG:4326
	echo -e "\n  ..export to KML, reprojection and reordering done!\n---\n"
else 
	echo -e "\n  You typed "$yesno" ..part skipped!\n---\n"
fi

#delete gdal cache!
echo -e "Deleting gdalwmscache before upload!"
echo -e "\n---\n" 
rm -rf d:/Projekte/tiroltrailhead/webmap/digitizing/gdalwmscache

#push to gh-pages

git add -A
git status
git commit -m 'batch updates from shell script..'
echo -e "\n---\n"  
read -p "Hit [Enter] to continue..."
git push origin gh-pages
echo -e "\n---\n"
read -p "Hit [Enter] to exit..."
