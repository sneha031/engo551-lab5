# ENGO 551 - Lab 5

LiveTracker is a simple IoT GeoWeb application built for ENGO 551 Lab 5. The purpose of this project is to combine the browser Geolocation API, MQTT messaging, and Leaflet mapping into one live web application. The app lets a user connect to an MQTT broker, generate a GeoJSON message containing their current location and a random temperature value, publish that message to a chosen MQTT topic, and then receive the same message back through subscription to display it on an interactive map.

## Features

- User can enter the MQTT broker host, port, and topic
- Start and End connection buttons for MQTT connection control
- Host, port, and topic fields lock while connected
- Automatic reconnect if the MQTT connection is lost
- “Share My Status” button creates a GeoJSON message with:
  - current location
  - random temperature
  - timestamp
  - source name
- Publishes the GeoJSON message through MQTT
- Subscribes to the selected MQTT topic and receives messages in real time
- Updates a Leaflet map marker based on incoming MQTT messages
- Popup shows temperature, latitude, and longitude
- Marker colour changes based on temperature:
  - Blue for temperatures below 10°C
  - Green for temperatures from 10°C to below 30°C
  - Red for temperatures 30°C and above
- Responsive layout for desktop and mobile use

