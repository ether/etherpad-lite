Vagrant::Config.run do |config|
  config.vm.box = "lucid32"
  config.vm.box_url = "http://files.vagrantup.com/lucid32.box"
  config.vm.customize ["modifyvm", :id, "--memory", "512"]
  config.vm.network :hostonly, "33.33.33.10"

  # enable this to see the GUI if vagrant cannot connect
  #config.vm.boot_mode = :gui

  config.vm.provision :puppet do |puppet|
    puppet.manifests_path = "puppet/manifests"
    puppet.manifest_file = "init.pp"
    # enable this to see verbose and debug puppet output
    #puppet.options = "--verbose --debug"
  end
  Vagrant::Config.run do |config|
    config.vm.share_folder("etherpad-code", "/home/etherpad/dev/etherpad", "../", :nfs => true)
  end

end
