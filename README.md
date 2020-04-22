# battleship
Simple battleship game using node.js and websockets

## Installation

Download the Battleship zip file, unzip, then install the ws module in the battleship folder.

$ npm install ws

Copy battleship.html plus the two mp3 sound effects files to whichever two computers are playing each other. Both of those computers will open battleship.html in a browser with the mp3 files residing in the same location.

## Operation

$ node server.js

This starts server.js, which uses ws (WebSocket library) to communicate with two HTML browser pages (battleship.html) via websockets. The server must be started first. It waits for the two pages to be started and to make contact. It then initiates and manages a battleship game.

The two HTML browser pages can be on the same computer (default). If one or both pages are on the local network then "localhost" in battleship.html must be replaced with the local network address of the server, e.g., 192.168.0.1. If one or both pages are on the Internet, then "localhost" in battleship.html must be replaced with the IP address of the server and the local router must forward port 3333, the default port.
