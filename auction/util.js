const { axiosInstance } = require("../axios/axiosInstance");

const getProductByauction = async (productId) => {
  const {
    data: {
      bidPrice,
      startPrice,
      duration,
      startTime,
      description,
      endTime,
      instant,
      productImages,
      seller,
      title,
      buyNowPrice,
      like,
      live,
    },
  } = await axiosInstance.post(`/product`, { productId, userId: 1 });
  return {
    price: Number(startPrice),
    operateTime: Number(duration) * 60 * 1000,
    perPrice: Number(bidPrice),
  };
};

const sellerIn = async (productId) => {
  await axiosInstance.patch(`/product/auction/sellerIn?productId=${productId}`);
};

const auctionFail = async (productId) => {
  await axiosInstance.patch(`/product/auctionFail/${productId}`);
};

const auctionPurchase = async (productId, endPrice, buyerId) => {
  await axiosInstance.post(`/product/auctionPurchase`, {
    productId,
    endPrice,
    buyerId,
  });
};

const getUserIdByNickname = async (nickname) => {
  const { data } = await axiosInstance.get(`/user/getId/${nickname}`);
  return data;
};

const getIsDescriptionTime = (descriptionTime, operateTime, remainTime) =>
  descriptionTime >= operateTime - remainTime;

const getIsAskAvoidTime = (avoidAskTime, operateTime, remainTime) =>
  avoidAskTime >= operateTime - remainTime;

module.exports = {
  getProductByauction,
  getIsDescriptionTime,
  getIsAskAvoidTime,
  sellerIn,
  auctionFail,
  auctionPurchase,
  getUserIdByNickname,
};
