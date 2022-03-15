# Firmware-updater

Simple typescript tool for updating firmware. Made for work purposes.

# Usage guide

## Environment preparation

### Download project files

Choose any place where you wanna arrange project, for example `/home/username/projects/`, go to this folder:

```sh
cd /home/username/projects/
```

Then cloning project files there:

```sh
git clone git@github.com:qwerty541/firmware-updater.git
```

Go to the appeared project folder:

```sh
cd ./firmware-updater/
```

### Compile firmware emulator

Important! For this step you need to have installed rust compiler, follow this link for details: https://www.rust-lang.org/tools/install

Now follow to subproject folder:

```sh
cd ./fake-firmware-process/
```
Begin compilation by this command:

```sh
cargo build
```

### HTTP firmware update server

After compilation of firmware emulator we need a http server from witch the new firmware version will be downloaded.

Important! For this and future steps you need to have installed nodejs, follow this link for details: https://nodejs.org/

Globally install nodejs package `http-server`:

```sh
sudo npm install -g http-server
```

After installation we need to prepare a folder for HTTP server where will be placed binary file with "new" version of firmware

Go to the project folder:

```sh
cd /home/username/projects/firmware-updater/
```

Init folder for HTTP server, for example `fake-http-server-storage`:

```sh
mkdir ./fake-http-server-storage/
```

Copy inside these new folder firmware binary file:

```sh
cp ./fake-firmware-process/target/debug/fake_firmware_process ./fake-http-server-storage/
```

Now we need to give that file a name with contains firmware version, for example `firmware-v2`. Version 2 because will have version 1 running and we will upgrade it to 2.

```sh
mv ./fake-http-server-storage/fake_firmware_process ./fake-http-server-storage/firmware-v2
```

Now all about HTTP server was read, lets run it:

```sh
cd ./fake-http-server-storage/
http-server
```

The console will show ip address and port of HTTP server. Now we need to move it with firmware binary file path in configuration file:

```sh
cd /home/username/projects/firmware-updater/firmware-updater/
mv ./config.example.json ./config.json
```

Now open `config.json` with any text editor and change properties `remoteFirmwareStorageServer` and `firmwareFileNameWithoutVersion` to your values. After these changes in configuration file these properties should look like:

```json
{
  "firmwareFileNameWithoutVersion": "firmware-v",
  "remoteFirmwareStorageServer": {
      "hostname": "127.0.0.1",
      "port": 8080,
      "path": "/"
  },
}
```

### Firmware storage

In current step will be organize folder for our current firmware binary file and write info about that in config file:

```sh
cd /home/username/projects/firmware-updater/
mkdir ./firmware-storage/
cp ./fake-firmware-process/target/debug/fake_firmware_process ./firmware-storage/
mv ./firmware-storage/fake_firmware_process ./firmware-storage/firmware-v1
```

After that we need to rewrite property `firmwareLocalStoragePath` in `config,json`. After changes it should look like: 

```json
{
  "firmwareLocalStoragePath": "/home/username/projects/firmware-updater/firmware-storage/",
}
```

### Systemd process

And the last preparation step, we need to run our current firmware binary `/home/username/projects/firmware-updater/firmware-storage/firmware-v1` as systemd process.

For that you need to create `.service` file from template:

```sh
cd /home/username/projects/firmware-updater/
sudo cp ./fake-firmware-process/fake_firmware.service /etc/systemd/system/
```

Then open this will with text editor and change path to firmware binary file to your actual:

```service
[Service]
ExecStart=/home/username/projects/firmware-updater/firmware-storage/firmware-v1
```

Now we can launch it with `systemctl` command:

```sh
sudo systemctl daemon-reload
sudo systemctl start fake_firmware
```

And check its status to be sure that everything went without errors:

```sh
sudo systemctl status fake_firmware
```

It remains only to change `systemdFirmwareServiceConfigurationFilePath` property in config file. After changes it should look like:

```json
{
  "systemdFirmwareServiceConfigurationFilePath": "/etc/systemd/system/fake_firmware.service"
}
```

## Firmware updater running

In all previous steps was completed correctly now we can launch `firmware-updater`.

```sh
cd /home/username/projects/firmware-updater/firmware-updater/
sudo yarn update-firmware
```

After script finished its work check that `firmware-storage` folder contains binary file `firmware-v2` instead `firmware-v1`, path to binary file inside `.service` file was changed and `sudo systemctl status fake_firmware` shows that process active and was run from new binary file.
