cd node_modules/
GHUSER=ether; curl "https://api.github.com/users/$GHUSER/repos?per_page=1000" | grep -o 'git@[^"]*' | grep /ep_ | xargs -L1 git clone
