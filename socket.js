const { Server } = require("socket.io");
const wrtc = require("@koush/wrtc");
const { makePC } = require("./MyWebRTC");
const { Auction, AuctionHouse, Manage } = require("./auction/auction");
const { getProductByauction } = require("./auction/util");

const OP_TIME = 5000;

const SocketMap = {};
// 상품 Seller의 PC
const ProductPC = {};
// 상품 Seller PC의 Stream 데이터
const ProductStream = {};
// 상품에 참여하는 사람들 정보
const ProductJoinUsers = {};
// 상품에 참여하는 모든 유저들의 pc 정보
const ProductUsersPC = {};

const findUserId = (productId, sockId) =>
  ProductJoinUsers[productId].filter(({ socketId }) => sockId === socketId)[0];

const AuctionList = {};
let ex;
const socketInit = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.set("io", io);
  io.on("connection", (socket) => {
    const req = socket.request;
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    console.log("socket 연결 성공 ip : ", ip);
    console.log(socket.id);

    //여기 부터 chating

    socket.on("setUid", (Id) => {
      SocketMap[Id] = socket.id;
      console.log(SocketMap);
    });

    //  여기부터 rtc

    socket.on("openAuction", ({ productId }) => {
      if (ProductPC[productId]) return;

      const onIceCandidateCallback = ({ candidate }) => {
        socket.to(socket.id).emit("getSenderCandidate", { candidate });
      };

      const onTrackCallback = (e) => {
        if (ProductStream[productId]) return;
        ProductStream[productId] = {
          id: socket.id,
          stream: e.streams[0],
          tracks: e.streams[0].getTracks(),
        };
      };

      const pc = makePC(onIceCandidateCallback, onTrackCallback);
      ProductPC[productId] = pc;
      ProductUsersPC[socket.id] = pc;

      const { price, operateTime, perPrice } = getProductByauction(productId);

      const auction = new Auction({ price, perPrice });
      const manage = new Manage({ operateTime });

      AuctionList[productId] = new AuctionHouse({
        seller: socket.id,
        auction,
        manage,
      });
      console.log("op before");

      const auctionTimer = setInterval(
        () => io.to(productId).emit("auctionTimer", manage.getRemainTime()),
        1000
      );
      let count = 0;

      const opFunc = setInterval(
        (productId) => {
          const auctionHouse = AuctionList[productId];
          count++;
          if (count < 60000 / OP_TIME) {
            return;
          }
          io.to(productId).emit("startAuction", "start");

          // 경매 끝났을 때
          if (!auctionHouse.manage.isRunning()) {
            clearInterval(auctionHouse.op);
            clearInterval(auctionTimer);

            const seller = auctionHouse.getSeller();
            io.to(seller).emit("endAuctionWithSeller", seller);

            const determinedBuyer = auctionHouse.conclusionUser.buyer;
            io.to(determinedBuyer).emit("endAuctionWithBuyer", determinedBuyer);

            const isNotDetermined = (id) =>
              ![this.seller, determinedBuyer].includes(id);

            const socketList = auctionHouse.users;
            const remainMembers =
              Array.from(socketList).filter(isNotDetermined);
            remainMembers.map((member) =>
              io.to(member).emit("endAuctionWithRemainder", member)
            );

            socket.leave(productId);
            delete AuctionList[productId];
            return;
            //호가 들어왔을 때
          } else if (
            auctionHouse.manage.isConclusionNow() &&
            auctionHouse.compare()
          ) {
            auctionHouse.conclusion(auctionHouse.manage.queue[0]);
            auctionHouse.auction.add();
            auctionHouse.manage.getRemainTime();
          }
          // 호가 없을 때, 경메 시작 후 10초 유예시간 줌
          else if (
            !auctionHouse.manage.isConclusionNow() &&
            count > 66000 / OP_TIME
          ) {
            clearInterval(auctionHouse.op);
            clearInterval(auctionTimer);

            const seller = auctionHouse.getSeller();
            io.to(seller).emit("endAuctionWithSeller", seller);

            const determinedBuyer = auctionHouse.conclusionUser.buyer;
            io.to(determinedBuyer).emit("endAuctionWithBuyer", determinedBuyer);

            const isNotDetermined = (id) =>
              ![this.seller, determinedBuyer].includes(id);

            const socketList = auctionHouse.users;
            const remainMembers =
              Array.from(socketList).filter(isNotDetermined);
            remainMembers.map((member) =>
              io.to(member).emit("endAuctionWithRemainder", member)
            );

            socket.leave(productId);
            delete AuctionList[productId];
            return;
          }

          io.to(productId).emit("updateAuctionStatus", {
            status: auctionHouse.conclusionUser.buyer,
            remainTime: auctionHouse.manage.getRemainTime(),
            price: auctionHouse.conclusionUser.price,
            nextPrice: auction.price,
          });

          auctionHouse.manage.initQueue();
        },
        OP_TIME,
        productId
      );

      AuctionList[productId].runAuction(opFunc);

      socket.join(productId);
    });

    socket.on("conclusion", ({ productId, price }) => {
      if (AuctionList[productId] === undefined) return;
      AuctionList[productId].manage.tryConclusion({ buyer: socket.id, price });
    });

    socket.on("sendAskPrice", ({ productId }) => {
      const { manage, auction } = AuctionList[productId];
      manage.tryConclusion({ buyer: socket.id, price: auction.price });
    });

    socket.on("senderOffer", async ({ sdp }) => {
      // socketToRoom[socket.id] = data.productId;
      const pc = ProductUsersPC[socket.id];

      pc.setRemoteDescription(sdp);

      const answerSdp = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVIdeo: true,
      });

      pc.setLocalDescription(answerSdp);

      io.to(socket.id).emit("getSenderAnswer", { sdp: answerSdp });
    });

    socket.on("senderCandidate", ({ candidate }) => {
      const pc = ProductUsersPC[socket.id];
      if (!candidate) return;
      pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    });

    socket.on("joinAuction", ({ productId, userId }) => {
      const onIceCandidateCallback = ({ candidate }) => {
        io.to(socket.id).emit("getReceiverCandidate", { candidate });
      };
      const onTrackCallback = (e) => {
        console.log("ontrack");
        console.log(e);
      };

      const pc = makePC(onIceCandidateCallback, onTrackCallback);

      const stream = ProductStream[productId].stream;
      const tracks = ProductStream[productId].tracks;
      console.log(stream.getTracks(), tracks);
      tracks.forEach((track) => pc.addTrack(track, stream));

      ProductUsersPC[socket.id] = pc;
      (ProductJoinUsers[productId] ?? []).push({ socketId: socket.id, userId });

      if (AuctionList[productId] === undefined) return;
      AuctionList[productId].join(socket.id);

      socket.join(productId);
    });

    socket.on("receiverCandidate", ({ candidate, productId }) => {
      const pc = ProductPC[productId];
      if (!candidate) return;
      pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    });

    socket.on("receiverOffer", async ({ sdp }) => {
      // socketToRoom[socket.id] = data.productId;

      const pc = ProductUsersPC[socket.id];
      pc.setRemoteDescription(sdp);

      const answerSdp = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVIdeo: true,
      });

      if (!pc.localDescription) pc.setLocalDescription(answerSdp);

      io.to(socket.id).emit("getReceiverAnswer", { sdp: answerSdp });
    });

    /**

 */

    //   socket.on("leaveRoom", () => {
    //     try {
    //       let roomId = socketToRoom[socket.id];

    //       deleteUser(socket.id, roomId);
    //       closeReceiverPC(socket.id);
    //       closeSenderPCs(socket.id);
    //       app.get("io").to(roomId).emit("userExit", socket.id);
    //     } catch (error) {
    //       console.log(error);
    //     }
    //   });
    //   socket.on("disconnect", () => {
    //     try {
    //       console.log("disconnect : ", socket.id);
    //       let roomId = socketToRoom[socket.id];

    //       deleteUser(socket.id, roomId);
    //       closeReceiverPC(socket.id);
    //       closeSenderPCs(socket.id);
    //       app.get("io").to(roomId).emit("userExit", socket.id);
    //     } catch (error) {
    //       console.log(error);
    //     }
    //   });
  });
};

exports.SocketMap = SocketMap;

exports.socketInit = socketInit;
