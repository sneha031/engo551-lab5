const enableLocationBtn = document.getElementById("enableLocationBtn");
const locationGate = document.getElementById("locationGate");
const shareStatusBtn = document.getElementById("shareStatusBtn");
const geojsonBox = document.getElementById("geojsonBox");

let hasLocationPermission = false;

const map = L.map("map").setView([51.0447, -114.0719], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

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

    getCurrentLocation((latitude, longitude) => {
        const fakeTemperature = getRandomTemperature();
        const geojsonMessage = buildGeoJSON(latitude, longitude, fakeTemperature);

        geojsonBox.textContent = JSON.stringify(geojsonMessage, null, 2);
    });
});