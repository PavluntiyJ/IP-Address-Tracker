"use strict";

const ipText = document.querySelector(".ip-text");
const locationText = document.querySelector(".location-text");
const timezoneText = document.querySelector(".timezone-text");
const ispText = document.querySelector(".ISP-text");
const contentBox = document.querySelector(".app__content-box");
const input = document.querySelector(".app__header-search-input");
const searchForm = document.querySelector(".app__header-search");

///////////////////////////////////////////
// LEAFLET MAP
// GLOBAL
const map = L.map("map");
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const locationIcon = L.icon({
  iconUrl: "../images/icon-location.svg",

  iconSize: [40, 50], // size of the icon
  iconAnchor: [20, 50], // point of the icon which will correspond to marker's location
});

////////////////////////////////
//////////////////////////////
const _loadMap = function (data) {
  const latitude = data.location.lat;
  const longitude = data.location.lng;

  const coords = [latitude, longitude];

  map.setView(coords, 13);

  L.marker(coords).addTo(map).bindPopup(`GOVNO`).openPopup();
};

const moveMap = function (data) {
  const { latitude } = data;
  const { longitude } = data;
  const coords = [latitude, longitude];

  map.panTo(coords, 13);

  L.marker(coords).addTo(map).bindPopup(`location`).openPopup();
};

///////////////////////////////////////////
// CONTENT BOX DATA

const clear = function () {
  ipText.textContent = "";
  locationText.textContent = "";
  timezoneText.textContent = "";
  ispText.textContent = "";
};

const enterInitialData = function (data) {
  ipText.textContent = data.ip;
  locationText.textContent = `${data.location.region}, ${data.location.country} `;
  timezoneText.textContent = `UTC ${data.location.timezone}`;
  ispText.textContent = data.isp;
};

const enterData = function (data) {
  if (data.error === true) alert("Wrong IP or domain address! Try again");
  clear();
  ipText.textContent = data.ip;
  locationText.textContent = `${data.city}, ${data.country_name} `;
  timezoneText.textContent = `UTC ${data.utc_offset.slice(
    0,
    3
  )}:${data.utc_offset.slice(3, data.utc_offset.length)}`;
  ispText.textContent = data.org;
};

///////////////////////////////////////////
//  IP API
async function getIP(ip = "") {
  try {
    let response = await fetch(
      `https://geo.ipify.org/api/v2/country,city?apiKey=at_q4IZJeuXydMW9QbuK0J5L9iYXj8WA&domain=${ip}`
    );
    let result = await response.json();
    enterInitialData(result);
    _loadMap(result);
    // if (!ip) contentBox.innerHTML = "";
  } catch {
    console.error(`something went wrong`);
  }
}
getIP();

searchForm.addEventListener("submit", function (e) {
  e.preventDefault();

  clear();

  getIP(input.value);

  input.value = "";
  input.blur();
});
//////////////////////////////////////////////////////////
// IP TO COORDS API
// const getCoordByIP = async function (ip = "") {
//   try {
//     let response = await fetch(`https://ipapi.co/${ip}/json/`);
//     let result = await response.json();
//     enterData(result);
//     moveMap(result);
//   } catch (err) {
//     console.error(`something went wrong! ${err}`);
//   }
// };
