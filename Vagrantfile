# -*- mode: ruby -*-

  $provisionScript = <<SCRIPT
    #Node & NPM
    sudo apt-get install -y curl
    curl -sL https://deb.nodesource.com/setup | sudo bash -  #We have to install from a newer location, the repo version is too old
    sudo apt-get install -y nodejs
	sudo ln -s /usr/bin/nodejs /usr/bin/node
	cd /vagrant
    sudo npm install --no-bin-links
SCRIPT

# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://atlas.hashicorp.com/search.
  config.vm.box = "hashicorp/precise64"

  config.vm.provider "virtualbox" do |v|
    v.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/v-root", "1"]
  end
  config.vm.network "private_network", ip: "192.168.33.11"
  
  #Hosts file plugin
  #To install: vagrant plugin install vagrant-hostsupdater
  #This will let you access the VM at servercooties.local once it's up
  config.vm.hostname = "servercooties.local"
  
  config.vm.provision "shell",
  inline: $provisionScript

end
