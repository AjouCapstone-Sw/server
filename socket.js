const { Server } = require("socket.io");
const wrtc = require("@koush/wrtc");
const { makePC } = require("./MyWebRTC");

const SocketMap = {};
// 상품 Seller의 PC
const ProductPC = {};
// 상품 Seller PC의 Stream 데이터
const ProductStream = {};
// 상품에 참여하는 사람들 정보
const ProductJoinUsers = {};
// 상품에 참여하는 모든 유저들의 pc 정보
const ProductUsersPC = {};

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
      const onIceCandidateCallback = ({ candidate }) =>
        socket.to(socket.id).emit("getSenderCandidate", { candidate });

      const onTrackCallback = (e) =>
        (ProductStream[productId] = { id: socket.id, stream: e.streams[0] });

      const pc = makePC(onIceCandidateCallback, onTrackCallback);
      ProductPC[productId] = pc;
      ProductUsersPC[socket.id] = pc;

      // 이게 필요할까? 채팅할때? senderOffer때 필요할까? joinAuction이 있는데.?
      // socket.join(productId);

      // product auction open db에 변경
    });

    socket.on("senderOffer", async ({ sdp }) => {
      // socketToRoom[socket.id] = data.productId;
      const pc = ProductUsersPC[socket.id];
      await pc.setRemoteDescription(sdp);

      const answerSdp = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVIdeo: true,
      });

      await pc.setLocalDescription(answerSdp);

      io.to(socket.id).emit("getSenderAnswer", { sdp: answerSdp });
    });

    socket.on("senderCandidate", ({ candidate }) => {
      const pc = ProductUsersPC[socket.id];
      if (!candidate) return;
      pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    });

    socket.on("joinAuction", ({ productId }) => {
      const onIceCandidateCallback = ({ candidate }) => {
        console.log("receiverCandidate가 발생해야 이게 실행됌");
        socket.to(socket.id).emit("getReceiverCandidate", { candidate });
      };

      const onTrackCallback = (e) => console.log(e);

      const pc = makePC(onIceCandidateCallback, onTrackCallback);

      const stream = ProductStream[productId].stream;
      // console.log(stream);
      // console.log(stream.getTracks());
      // stream.getTracks().forEach((track) => console.log(track));
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      ProductUsersPC[socket.id] = pc;
      (ProductJoinUsers[productId] ??= []).push(socket.id);
    });

    socket.on("receiverCandidate", ({ candidate, productId }) => {
      console.log(
        "프론트에서 onicecandidate발생하면 이벤트 호출되는데 호출을 안해서 동작안함"
      );
      console.log("이게 동작해야 joinAuction에서 등록한 callback함수가 실행됌");
      const pc = ProductPC[productId];
      pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    });

    socket.on("receiverOffer", async ({ sdp }) => {
      // socketToRoom[socket.id] = data.productId;
      const pc = ProductUsersPC[socket.id];
      await pc.setRemoteDescription(sdp);

      const answerSdp = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVIdeo: true,
      });
      await pc.setLocalDescription(answerSdp);

      io.to(socket.id).emit("getReceiverAnswer", { sdp: answerSdp });
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
