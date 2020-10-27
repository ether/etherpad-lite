for dir in `ls node_modules`;
do
# echo $0
if [[ $dir == *"ep_"* ]]; then
if [[ $dir != "ep_etherpad-lite" ]]; then
node bin/plugins/checkPlugin.js $dir autofix autocommit
fi
fi
# echo $dir
done
