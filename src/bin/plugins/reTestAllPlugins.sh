echo "herp";
for dir in `ls node_modules`;
do
  echo $dir
  if [[ $dir == *"ep_"* ]]; then
    if [[ $dir != "ep_etherpad-lite" ]]; then
      # node src/bin/plugins/checkPlugin.js $dir autofix autocommit autoupdate
      cd node_modules/$dir
      git commit -m "Automatic update: bump update to re-run latest Etherpad tests" --allow-empty
      git push origin master
      cd ../..
    fi
  fi
done
