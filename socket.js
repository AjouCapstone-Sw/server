const { Server } = require('socket.io');
const wrtc = require('@koush/wrtc');
const { makePC } = require('./MyWebRTC');
const { Auction, AuctionHouse, Manage } = require('./auction/auction');
const { getProductByauction } = require('./auction/util');

const SocketMap = {};
// 상품 Seller의 PC
const ProductPC = {};
// 상품 Seller PC의 Stream 데이터
const ProductStream = {};
// 상품에 참여하는 사람들 정보
const ProductJoinUsers = {};
// 상품에 참여하는 모든 유저들의 pc 정보
const ProductUsersPC = {};

const AuctionList = {};

const socketInit = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.set('io', io);
  io.on('connection', (socket) => {
    const req = socket.request;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('socket 연결 성공 ip : ', ip);
    console.log(socket.id);

    //여기 부터 chating

    socket.on('setUid', (Id) => {
      SocketMap[Id] = socket.id;
      console.log(SocketMap);
    });

    //  여기부터 rtc

    socket.on('openAuction', ({ productId }) => {
      if (ProductPC[productId]) return;
      const onIceCandidateCallback = ({ candidate }) =>
        socket.to(socket.id).emit('getSenderCandidate', { candidate });

      const onTrackCallback = (e) =>
        (ProductStream[productId] = { id: socket.id, stream: e.streams[0] });

      const pc = makePC(onIceCandidateCallback, onTrackCallback);
      ProductPC[productId] = pc;
      ProductUsersPC[socket.id] = pc;

      const { price, operateTime, perPrice } = getProductByauction(productId);

      const auction = new Auction({ price, perPrice });
      const manage = new Manage({ operateTime });
      AuctionList[productId] = new AuctionHouse({ seller: socket.id, auction, manage });

      const opFunc = setInterval(
        (productId) => {
          const auctionHouse = AuctionList[productId];

          if (!auctionHouse.manage.isRunning()) {
            clearInterval(auctionHouse.op);

            const seller = auctionHouse.getSeller();
            io.to(seller).emit('endAuctionWithSeller', seller);

            const determinedBuyer = auctionHouse.conclusionUser.buyer;
            io.to(determinedBuyer).emit('endAuctionWithBuyer', determinedBuyer);

            const isNotDetermined = (id) => ![this.seller, determinedBuyer].includes(id);

            const socketList = auctionHouse.users;
            const remainMembers = Array.from(socketList).filter(isNotDetermined);
            remainMembers.map((member) => io.to(member).emit('endAuctionWithRemainder', member));

            socket.leave(productId);
            delete AuctionList[productId];
            return;
          } else if (
            auctionHouse.manage.isConclusionNow() &&
            auctionHouse.auction.compare(auctionHouse.manage.queue[0].price)
          ) {
            auctionHouse.conclusion(auctionHouse.manage.queue[0]);
            auctionHouse.auction.add();
            auctionHouse.manage.getRemainTime();
          }

          io.to(productId).emit('updateAuctionStatus', {
            status: auctionHouse.conclusionUser,
            remainTime: auctionHouse.manage.getRemainTime(),
            price: auctionHouse.auction.price,
          });

          auctionHouse.manage.initQueue();
        },
        2000,
        productId
      );

      AuctionList[productId].runAuction(opFunc);

      socket.join(productId);
    });

    socket.on('conclusion', ({ productId, price }) => {
      if (AuctionList[productId] === undefined) return;
      AuctionList[productId].manage.tryConclusion({ buyer: socket.id, price });
    });

    socket.on('senderOffer', async ({ sdp }) => {
      // socketToRoom[socket.id] = data.productId;
      const pc = ProductUsersPC[socket.id];
      await pc.setRemoteDescription(sdp);

      const answerSdp = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVIdeo: true,
      });

      await pc.setLocalDescription(answerSdp);

      io.to(socket.id).emit('getSenderAnswer', { sdp: answerSdp });
    });

    socket.on('senderCandidate', ({ candidate }) => {
      const pc = ProductUsersPC[socket.id];
      if (!candidate) return;
      pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    });

    socket.on('joinAuction', ({ productId }) => {
      const onIceCandidateCallback = ({ candidate }) => {
        console.log('receiverCandidate가 발생해야 이게 실행됌');
        socket.to(socket.id).emit('getReceiverCandidate', { candidate });
      };

      const onTrackCallback = (e) => console.log(e);

      const pc = makePC(onIceCandidateCallback, onTrackCallback);

      const stream = ProductStream[productId].stream;
      console.log(stream);
      console.log(stream.getTracks());
      stream.getTracks().forEach((track) => console.log(track));
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      ProductUsersPC[socket.id] = pc;
      (ProductJoinUsers[productId] ?? []).push(socket.id);

      if (AuctionList[productId] === undefined) return;
      AuctionList[productId].join(socket.id);

      socket.join(productId);
    });

    socket.on('receiverCandidate', ({ candidate, productId }) => {
      console.log('프론트에서 onicecandidate발생하면 이벤트 호출되는데 호출을 안해서 동작안함');
      console.log('이게 동작해야 joinAuction에서 등록한 callback함수가 실행됌');
      const pc = ProductPC[productId];
      pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    });

    socket.on('receiverOffer', async ({ sdp }) => {
      // socketToRoom[socket.id] = data.productId;
      const pc = ProductUsersPC[socket.id];
      await pc.setRemoteDescription(sdp);

      const answerSdp = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVIdeo: true,
      });
      await pc.setLocalDescription(answerSdp);

      io.to(socket.id).emit('getReceiverAnswer', { sdp: answerSdp });
    });

    /**
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 


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
