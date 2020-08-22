for dir in `ls node_modules`;
do
# echo $0
if [[ $dir == *"ep_"* ]]; then
if [[ $dir != "ep_etherpad-lite" ]]; then
cd node_modules/$dir
git commit -m "bumping to run tests" --allow-empty
git push origin master
cd ../..
fi
fi
# echo $dir
done
