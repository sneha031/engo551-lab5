const enableLocationBtn = document.getElementById("enableLocationBtn");
const locationGate = document.getElementById("locationGate");

enableLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        () => {
            locationGate.classList.add("hidden");
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
});