cd ~
cd D:/Projekte/tiroltrailhead/

echo -e "\n---\n  Pull from Remote??\n  Hit y/n + [Enter]:"
read yesno
if [ "$yesno" = "y" ] 

git status
sleep.exe 10

git pull origin gh-pages

sleep.exe 20
