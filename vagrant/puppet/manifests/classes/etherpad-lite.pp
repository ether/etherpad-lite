class etherpad-lite {
    package { "curl":
        ensure => latest,
        require => Exec["apt-get-update"];
    }

    file { "/home/etherpad":
        require => User[etherpad],
        owner => etherpad,
        group => etherpad,
        mode  => 775,
        recurse=> false,
        ensure => directory;
    }

    file { "/home/etherpad/dev":
        require => File["/home/etherpad"],
        owner => etherpad,
        group => etherpad,
        mode  => 775,
        recurse=> false,
        ensure => directory;
    }

    user { "etherpad":
        ensure => "present",
        uid => "10000",
        shell => "/bin/bash",
        managehome => true;
    }

    exec { "/bin/bash bin/installDeps.sh":
        alias => "install-etherpad-deps",
        require => Exec["install-npm"],
        environment => "HOME=/home/etherpad",
        cwd => "/home/etherpad/dev/etherpad",
        logoutput => on_failure,
        user => "etherpad";
    }

    exec { "/bin/bash bin/run.sh &":
        alias => "run-etherpad-lite",
        require => Exec["install-etherpad-deps"],
        environment => "HOME=/home/etherpad",
        cwd => "/home/etherpad/dev/etherpad",
        logoutput => on_failure,
        user => "etherpad";
    }

    group { "puppet":
        ensure => "present",
    }
}
