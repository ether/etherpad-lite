class node-js {
    package { ["build-essential"]:
        ensure => latest,
        require => Exec["apt-get-update"];
    }

    exec { "/usr/bin/apt-get update":
        alias => "apt-get-update";
    }

    exec {
        "/usr/bin/wget -N http://nodejs.org/dist/${node_version}/node-${node_version}.tar.gz":
            alias => "download-node",
            user => "etherpad",
            cwd => "/home/etherpad/dev/",
            require => File["/home/etherpad/dev"];

        "/bin/tar zxf node-${node_version}.tar.gz":
            alias => "unpack-node",
            user => "etherpad",
            cwd => "/home/etherpad/dev/",
            creates => "/home/etherpad/dev/etherpad/node-${node_version}",
            require => Exec["download-node"];

        "/home/etherpad/dev/node-${node_version}/configure --prefix=/home/etherpad/node-${node_version} && /usr/bin/make install":
            alias => "install-node",
            environment => "HOME=/home/etherpad",
            user => "etherpad",
            cwd => "/home/etherpad/dev/node-${node_version}",
            creates => "/home/etherpad/node-${node_version}",
            timeout => 0,
            require => [Exec["unpack-node"], Package["build-essential"]];

        "/usr/bin/wget -N http://registry.npmjs.org/npm/-/npm-${npm_version}.tgz":
            alias => "download-npm",
            user => "etherpad",
            cwd => "/home/etherpad/dev/",
            require => Exec["install-node"];

        "/bin/mkdir npm-${npm_version} && /bin/tar -C npm-${npm_version} -xf npm-${npm_version}.tgz":
            alias => "unpack-npm",
            user => "etherpad",
            cwd => "/home/etherpad/dev/",
            creates => "/home/etherpad/dev/npm-${npm_version}",
            require => Exec["download-npm"];

        "/usr/bin/make install":
            alias => "install-npm",
            environment => ["HOME=/home/etherpad", "UID=10000"],
            user => "etherpad",
            cwd => "/home/etherpad/dev/npm-${npm_version}/package",
            require => Exec["unpack-npm"];
    }
}
