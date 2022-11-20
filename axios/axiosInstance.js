const axios = require("axios");

const axiosInstance = axios.create({
  baseURL: "https://theajou.shop",
  // withCredentials: true,
});

exports.axiosInstance = axiosInstance;
