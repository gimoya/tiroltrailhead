echo -e "\n---\n  ..reproject, reorder Trails? Hit y/n + [Enter]:"
read yesno
if [ "$yesno" = "y" ] 
then
	ogr2ogr my_trails_z.geojson my_trails_z_epsg3857.gpkg -s_srs EPSG:900913 -t_srs EPSG:4326
else 
	echo -e "\n  You typed "$yesno" ..part skipped!\n---\n"
fi
echo -e "\n---\n"
read -p "Hit [Enter] to exit..."