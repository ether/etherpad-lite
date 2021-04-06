cd node_modules/
GHUSER=ether; curl "https://api.github.com/users/$GHUSER/repos?per_page=100" | grep -o 'git@[^"]*' | grep /ep_ | xargs -L1 git clone
GHUSER=ether; curl "https://api.github.com/users/$GHUSER/repos?per_page=100&page=2&" | grep -o 'git@[^"]*' | grep /ep_ | xargs -L1 git clone
GHUSER=ether; curl "https://api.github.com/users/$GHUSER/repos?per_page=100&page=3&" | grep -o 'git@[^"]*' | grep /ep_ | xargs -L1 git clone
