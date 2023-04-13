echo -e "\n---\n  ..reproject Legacy Trails? Hit y/n + [Enter]:"
read yesno
if [ "$yesno" = "y" ] 
then
	cd ~
	cd d:/Projekte/tiroltrailhead/traillegacy
	ogr2ogr my_trails_z.geojson my_trails_z_epsg3857.geojson -s_srs EPSG:900913 -t_srs EPSG:4326
else 
	echo -e "\n  You typed "$yesno" ..part skipped!\n---\n"
fi

echo -e "\n---\n"


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