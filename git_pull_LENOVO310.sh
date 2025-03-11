cd ~
cd D:/Projekte/tiroltrailhead/

echo -e "\n---\n  Pull from Remote??\n  Hit y/n + [Enter]:"
read yesno
if [ "$yesno" = "y" ] 
then
	git status
	sleep.exe 10

	git pull origin gh-pages
sleep.exe 20
else 
	echo -e "\n  You typed "$yesno" ..part skipped!\n---\n"
fi
read -p "Hit [Enter] to exit..."
