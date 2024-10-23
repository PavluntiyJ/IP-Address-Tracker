"use strict";

const ipText = document.querySelector(".ip-text");
const locationText = document.querySelector(".location-text");
const timezoneText = document.querySelector(".timezone-text");
const ispText = document.querySelector(".ISP-text");
const contentBox = document.querySelector(".app__content-box");
const input = document.querySelector(".app__header-search-input");
const searchForm = document.querySelector(".app__header-search");

const appHeader = document.querySelector(".app__header");

///////////////////////////////////////////
// LEAFLET MAP
// GLOBAL
const map = L.map("map");
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

////////////////////////////////
const _loadMap = function (data) {
  const latitude = data.location.lat;
  const longitude = data.location.lng;
  const coords = [latitude, longitude];

  map.setView(coords, 13);

  // MARKER

  const locationIcon = L.icon({
    iconUrl: "../images/icon-location.svg",

    iconSize: [40, 50], // size of the icon
    iconAnchor: [20, 50], // point of the icon which will correspond to marker's location
  });

  L.marker(coords, { icon: locationIcon }).addTo(map).openPopup();
};

///////////////////////////////////////////
// CONTENT BOX DATA

const enterData = function (data) {
  ipText.textContent = data.ip;
  locationText.textContent = `${data.location.region}, ${data.location.country} `;
  timezoneText.textContent = `UTC ${data.location.timezone}`;
  ispText.textContent = data.isp;
};

///////////////////////////////////////////
//  IP API
async function getIP(ip = "") {
  try {
    let response = await fetch(
      `https://geo.ipify.org/api/v2/country,city?apiKey=at_X9I9qNOscUQP2Nv5wO8CUwvqWGaDE&domain=${ip}`
    );
    if (!response.ok)
      throw new Error(
        "Invalid IP address or domain name format (e.g google.com). Try again!"
      );
    // process result
    let result = await response.json();
    enterData(result);
    _loadMap(result);
  } catch (err) {
    displayError("Error: " + err.message);
  }
}

function displayError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error";
  errorDiv.textContent = message;
  appHeader.appendChild(errorDiv); // Append to contentBox instead of body
  // setTimeout(() => errorDiv.remove(), 5000); // Error message disappears after 5 seconds
}

// Initial call
getIP();

// Event listener for form submission
searchForm.addEventListener("submit", function (e) {
  e.preventDefault();
  getIP(input.value);
  input.value = "";
  input.blur();
});
