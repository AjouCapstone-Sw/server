const wrtc = require("@koush/wrtc");

const pc_config = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const makePC = (onIceCandidateCallback, onTrackCallback) => {
  const pc = new wrtc.RTCPeerConnection(pc_config);

  pc.onicecandidate = (e) => {
    onIceCandidateCallback(e);
  };
  pc.ontrack = (e) => onTrackCallback(e);

  return pc;
};

exports.makePC = makePC;
