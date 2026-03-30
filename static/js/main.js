const enableLocationBtn = document.getElementById("enableLocationBtn");
const locationGate = document.getElementById("locationGate");
const shareStatusBtn = document.getElementById("shareStatusBtn");
const geojsonBox = document.getElementById("geojsonBox");
const receivedBox = document.getElementById("receivedBox");
const mqttStatus = document.getElementById("mqttStatus");
const brokerHostInput = document.getElementById("brokerHost");
const brokerPortInput = document.getElementById("brokerPort");
const mqttTopicInput = document.getElementById("mqttTopic");
const startMqttBtn = document.getElementById("startMqttBtn");
const endMqttBtn = document.getElementById("endMqttBtn");

let hasLocationPermission = false;
let mqttClient = null;
let isMqttConnected = false;
let liveMarker = null;

let reconnectTimer = null;
let shouldAutoReconnect = false;
let activeTopic = "";

const RECONNECT_DELAY_MS = 3000;

const map = L.map("map").setView([51.0447, -114.0719], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

function generateClientId() {
    return "livetracker_" + Math.random().toString(16).slice(2, 10);
}

function setMqttStatus(message) {
    mqttStatus.textContent = message;
}

function updateConnectionUI() {
    const lockInputs = isMqttConnected || shouldAutoReconnect;

    brokerHostInput.disabled = lockInputs;
    brokerPortInput.disabled = lockInputs;
    mqttTopicInput.disabled = lockInputs;

    startMqttBtn.disabled = lockInputs;
    endMqttBtn.disabled = !lockInputs;

    startMqttBtn.style.opacity = lockInputs ? "0.7" : "1";
    endMqttBtn.style.opacity = lockInputs ? "1" : "0.7";
}

function clearReconnectTimer() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function scheduleReconnect() {
    if (!shouldAutoReconnect || reconnectTimer) {
        return;
    }

    setMqttStatus("Disconnected - retrying in 3 seconds...");
    updateConnectionUI();

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;

        if (!shouldAutoReconnect || isMqttConnected) {
            return;
        }

        connectToMqtt(true);
    }, RECONNECT_DELAY_MS);
}

function getRandomTemperature() {
    return Math.floor(Math.random() * 101) - 40;
}

function buildGeoJSON(latitude, longitude, temperature) {
    return {
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
        },
        properties: {
            temperature: temperature,
            timestamp: new Date().toISOString(),
            source: "LiveTracker"
        }
    };
}

function getCurrentLocation(onSuccess) {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            onSuccess(latitude, longitude);
        },
        () => {
            alert("Location access was denied. Please allow location to continue.");
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function getTemperatureClass(temperature) {
    if (temperature < 10) {
        return "temp-blue";
    }
    if (temperature < 30) {
        return "temp-green";
    }
    return "temp-red";
}

function createTemperatureIcon(temperature) {
    const tempClass = getTemperatureClass(temperature);

    return L.divIcon({
        className: "",
        html: `<div class="temp-marker ${tempClass}"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12]
    });
}

function updateMapFromGeoJSON(geojsonMessage) {
    if (
        !geojsonMessage ||
        geojsonMessage.type !== "Feature" ||
        !geojsonMessage.geometry ||
        geojsonMessage.geometry.type !== "Point" ||
        !Array.isArray(geojsonMessage.geometry.coordinates)
    ) {
        return;
    }

    const [longitude, latitude] = geojsonMessage.geometry.coordinates;
    const temperature = Number(geojsonMessage.properties?.temperature);

    if (
        Number.isNaN(latitude) ||
        Number.isNaN(longitude) ||
        Number.isNaN(temperature)
    ) {
        return;
    }

    const coords = [latitude, longitude];
    const popupContent = `
        <strong>LiveTracker Status</strong><br>
        Temperature: ${temperature}°C<br>
        Latitude: ${latitude.toFixed(6)}<br>
        Longitude: ${longitude.toFixed(6)}
    `;

    if (!liveMarker) {
        liveMarker = L.marker(coords, {
            icon: createTemperatureIcon(temperature)
        }).addTo(map);
    } else {
        liveMarker.setLatLng(coords);
        liveMarker.setIcon(createTemperatureIcon(temperature));
    }

    liveMarker.bindPopup(popupContent);
    liveMarker.openPopup();
    map.setView(coords, 15);
}

function getBrokerSettings() {
    const host = brokerHostInput.value.trim();
    const port = Number(brokerPortInput.value);

    if (!host) {
        alert("Please enter a valid broker host.");
        return null;
    }

    if (!port || Number.isNaN(port)) {
        alert("Please enter a valid broker port.");
        return null;
    }

    return { host, port };
}

function getTopicValue() {
    const topic = mqttTopicInput.value.trim();

    if (!topic) {
        alert("Please enter a valid MQTT topic.");
        return null;
    }

    return topic;
}

function connectToMqtt(isReconnectAttempt = false) {
    if (isMqttConnected) {
        return;
    }

    const settings = getBrokerSettings();
    const selectedTopic = getTopicValue();

    if (!settings || !selectedTopic) {
        setMqttStatus("Invalid MQTT Settings");
        shouldAutoReconnect = false;
        clearReconnectTimer();
        updateConnectionUI();
        return;
    }

    clearReconnectTimer();
    shouldAutoReconnect = true;
    activeTopic = selectedTopic;

    setMqttStatus(isReconnectAttempt ? "Reconnecting..." : "Connecting...");
    updateConnectionUI();

    mqttClient = new Paho.MQTT.Client(
        settings.host,
        settings.port,
        generateClientId()
    );

    mqttClient.onConnectionLost = (responseObject) => {
        isMqttConnected = false;
        mqttClient = null;

        if (!shouldAutoReconnect) {
            setMqttStatus("Not Connected");
            updateConnectionUI();
            return;
        }

        console.log("Connection lost:", responseObject?.errorMessage || "Unknown error");
        scheduleReconnect();
    };

    mqttClient.onMessageArrived = (message) => {
        receivedBox.textContent = message.payloadString;

        try {
            const parsedMessage = JSON.parse(message.payloadString);
            updateMapFromGeoJSON(parsedMessage);
        } catch (error) {
            console.error("Could not parse MQTT message as JSON:", error);
        }
    };

    mqttClient.connect({
        useSSL: settings.port === 8081,
        timeout: 5,
        onSuccess: () => {
            isMqttConnected = true;
            clearReconnectTimer();
            setMqttStatus("Connected");

            mqttClient.subscribe(activeTopic, {
                onSuccess: () => {
                    setMqttStatus(`Connected & Subscribed: ${activeTopic}`);
                    updateConnectionUI();
                },
                onFailure: () => {
                    isMqttConnected = false;
                    mqttClient = null;
                    setMqttStatus("Subscribe Failed - retrying...");
                    updateConnectionUI();
                    scheduleReconnect();
                }
            });
        },
        onFailure: (error) => {
            isMqttConnected = false;
            mqttClient = null;

            if (!shouldAutoReconnect) {
                setMqttStatus("Connection Failed");
                updateConnectionUI();
                return;
            }

            console.log("Connection failed:", error?.errorMessage || "Unknown error");
            setMqttStatus("Connection Failed - retrying...");
            updateConnectionUI();
            scheduleReconnect();
        }
    });
}

function disconnectMqtt() {
    shouldAutoReconnect = false;
    clearReconnectTimer();

    if (mqttClient) {
        try {
            mqttClient.disconnect();
        } catch (error) {
            console.log("MQTT disconnect error:", error);
        }
    }

    mqttClient = null;
    isMqttConnected = false;
    activeTopic = "";
    setMqttStatus("Not Connected");
    updateConnectionUI();
}

function publishGeoJSON(geojsonMessage) {
    if (!mqttClient || !isMqttConnected) {
        alert("MQTT is not connected yet.");
        return;
    }

    const payload = JSON.stringify(geojsonMessage, null, 2);
    const message = new Paho.MQTT.Message(payload);
    message.destinationName = activeTopic;
    mqttClient.send(message);
}

enableLocationBtn.addEventListener("click", () => {
    getCurrentLocation(() => {
        hasLocationPermission = true;
        locationGate.classList.add("hidden");
    });
});

shareStatusBtn.addEventListener("click", () => {
    if (!hasLocationPermission) {
        alert("Please allow location access first.");
        return;
    }

    if (!isMqttConnected) {
        alert("Please click Start Connection first.");
        return;
    }

    getCurrentLocation((latitude, longitude) => {
        const fakeTemperature = getRandomTemperature();
        const geojsonMessage = buildGeoJSON(latitude, longitude, fakeTemperature);

        geojsonBox.textContent = JSON.stringify(geojsonMessage, null, 2);
        publishGeoJSON(geojsonMessage);
    });
});

startMqttBtn.addEventListener("click", () => {
    connectToMqtt(false);
});

endMqttBtn.addEventListener("click", () => {
    disconnectMqtt();
});

updateConnectionUI();