const { getIsDescriptionTime, getIsAskAvoidTime } = require("../auction/util");

const DESCRIPTION_TIME = 60000;
const AVOID_ASK_TIME = DESCRIPTION_TIME + 10000;

const makeAuctionTimer = (manage, io, productId) => {
  let isLongAskTimer = true;
  let shorAskTriggered = false;

  const auctionTimer = setInterval(() => {
    const isDescriptionTime = getIsDescriptionTime(
      DESCRIPTION_TIME,
      manage.operateTime,
      manage.getRemainTime()
    );

    const isAskAvoidTime = getIsAskAvoidTime(
      AVOID_ASK_TIME,
      manage.operateTime,
      manage.getRemainTime()
    );

    io.to(productId).emit("auctionTimer", manage.getRemainTime());
    //설명 타이머
    if (isDescriptionTime)
      io.to(productId).emit(
        "setDescriptionTime",
        DESCRIPTION_TIME - (manage.operateTime - manage.getRemainTime())
      );
    // 긴 호가 타이머
    else if (!isDescriptionTime && isLongAskTimer) {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          console.log("긴 호가 타이머 i : ", i);
          io.to(productId).emit("updateAskTime", 10 - i);
        }, i * 1000);
      }
      isLongAskTimer = false;
    }
    //호가 타이머
    else if (!isAskAvoidTime && !isLongAskTimer && !shorAskTriggered) {
      shorAskTriggered = true;
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          console.log("호가 타이머 i : ", i);
          io.to(productId).emit("updateAskTime", 5 - i);
          if (i === 4) shorAskTriggered = false;
        }, i * 1000);
      }
    }
  }, 1000);

  return auctionTimer;
};

exports.makeAuctionTimer = makeAuctionTimer;
