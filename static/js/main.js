const enableLocationBtn = document.getElementById("enableLocationBtn");
const locationGate = document.getElementById("locationGate");
const shareStatusBtn = document.getElementById("shareStatusBtn");

let marker = null;
let hasLocationPermission = false;

const map = L.map("map").setView([51.0447, -114.0719], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

function updateMapLocation(latitude, longitude) {
    const coords = [latitude, longitude];

    if (!marker) {
        marker = L.marker(coords).addTo(map);
    } else {
        marker.setLatLng(coords);
    }

    marker.bindPopup(`
        <strong>Your Current Location</strong><br>
        Latitude: ${latitude.toFixed(6)}<br>
        Longitude: ${longitude.toFixed(6)}
    `);

    map.setView(coords, 15);
    marker.openPopup();
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
        updateMapLocation(latitude, longitude);
    });
});