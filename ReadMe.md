# ARBD

**ARBD** stands for **Attendance Records By Dates**. This code works via **W-LAN** and tracks all users by their **MAC** addresses on your network.
**ARBD** constantly monitors your WLAN and keeps updating csv to track all users and their time spent over the network. 

## Usage
Update **users.csv** file, with MAC address and Email of the users whose tracking is to be done. This file would be used to generate csv, of their activity on your network. 

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install necessary dependencies.

```bash
npm i
```
*Incase your system does not have  arp-scan installed, use following command.

For Linux/Ubuntu
```bash
sudo apt-get install arp-scan
```

For MacOS
```bash
brew install arp-scan
```

*Note: This code is tested successfully on Ubuntu. For Windows few additional changes would be required.


## Start

```bash
sudo node index.js
```
*Note : **sudo** is necessary as internally function uses arp-scan in sudo mode to function properly.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Also please give a star if this code helps in any way.
