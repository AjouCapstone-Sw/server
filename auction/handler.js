const auctionExit = (auctionHouse, io, productId, seller, closeAuction) => {
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

exports.auctionExit = auctionExit;
