const axios = require("axios");

const axiosInstance = axios.create({
  baseURL: "https://theajou.shop/api",
  // withCredentials: true,
});

exports.axiosInstance = axiosInstance;
