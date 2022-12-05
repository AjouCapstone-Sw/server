const auctionExit = (auctionHouse, io, productId, seller, flag) => {
  const seller1 = auctionHouse.getSeller();
  const price = auctionHouse.conclusionUser?.price ?? 0;
  if (flag) io.to(seller1).emit("endAuctionWithSeller", { price });
  else io.to(seller1).emit("endAuctionWithSeller", productId);

  const determinedBuyer = auctionHouse.conclusionUser?.buyer;
  const determinedPrice = auctionHouse.conclusionUser?.price;

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
