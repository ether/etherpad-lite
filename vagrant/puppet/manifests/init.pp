$node_version = "v0.6.14"
$npm_version = "1.1.12"

Exec { 
  logoutput => on_failure,
  path => "/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games:/opt/ruby/bin/:/home/etherpad/node-${node_version}/bin",

}

import "classes/*"
import "nodes/*"
