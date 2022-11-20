const { axiosInstance } = require("../axios/axiosInstance");

const getProductByauction = async (productId) => {
  const {
    data: {
      description,
      endTime,
      instant,
      productImages,
      seller,
      bidPrice,
      startPrice,
      startTime,
      duration,
      title,
      buyNowPrice,
      like,
      live,
    },
  } = await axiosInstance.get(`/product/${productId}`);
  return {
    price: Number(startPrice),
    operateTime: Number(duration) * 60 * 1000,
    perPrice: Number(bidPrice),
  };
};

module.exports = { getProductByauction };
