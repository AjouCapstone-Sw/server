const { auctionFail, getUserIdByNickname, auctionPurchase } = require("./util");

const auctionExit = async (
  auctionHouse,
  io,
  productId,
  seller,
  closeAuction,
  socketMap
) => {
  const sellerSocketId = auctionHouse.getSeller();
  const price = auctionHouse.conclusionUser?.price ?? 0;

  const determinedBuyer = auctionHouse.conclusionUser?.buyer;
  const determinedPrice = auctionHouse.conclusionUser?.price;

  io.to(sellerSocketId).emit("endAuctionWithSeller", { price, productId });
  io.to(determinedBuyer).emit("endAuctionWithBuyer", {
    productId,
    price: determinedPrice,
    seller,
  });

  if (!determinedBuyer) {
    auctionFail(productId);
  } else {
    const buyerNickname = socketMap[determinedBuyer].id;
    const buyerId = await getUserIdByNickname(buyerNickname);
    auctionPurchase(productId, determinedPrice, buyerId);
  }

  const isNotDetermined = (id) => ![this.seller, determinedBuyer].includes(id);
  const socketList = auctionHouse.users;
  const remainMembers = Array.from(socketList).filter(isNotDetermined);
  remainMembers.map((member) =>
    io.to(member).emit("endAuctionWithRemainder", {
      productId,
      seller,
    })
  );
  closeAuction(productId);
};

const otherAuctionJoinCheck = (AuctionList, userSocketId) => {
  const [productId] = Object.entries(AuctionList).reduce((acc, cur) => {
    const [key, value] = cur;
    if (value.conclusionUser?.buyer === userSocketId) acc.push(key);
    return acc;
  }, []);
  return productId;
};

exports.auctionExit = auctionExit;
exports.otherAuctionJoinCheck = otherAuctionJoinCheck;
