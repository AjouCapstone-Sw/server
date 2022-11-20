class AuctionHouse {
  constructor({ seller, auction, manage }) {
    this.users = [seller];
    this.seller = seller;
    this.auction = auction;
    this.op = null;
    this.conclusionUser = null;
    this.manage = manage;
  }
  getSeller() {
    return this.seller;
  }

  setConclusionPrice(price) {
    this.conclusionPrice = price;
  }

  join(user) {
    this.users.push(user);
  }

  runAuction(op) {
    this.op = op;
  }

  conclusion(user) {
    this.conclusionUser = user;
  }

  compare() {
    return this.manage.queue[0].price === this.auction.price;
  }

  getUserLength() {
    return this.users.length;
  }
}

class Manage {
  constructor({ operateTime }) {
    this.startTime = new Date().getTime();
    this.operateTime = operateTime;
    this.queue = [];
  }
  isRunning() {
    const time = new Date().getTime();
    return time - this.startTime < this.operateTime;
  }

  isConclusionNow() {
    return !!this.queue.length;
  }

  getDeterminedBuyer() {
    return this.isConclusionNow() ? this.queue[0].buyer : undefined;
  }

  getRemainTime() {
    const time = new Date().getTime();
    return this.operateTime - (time - this.startTime);
  }

  tryConclusion({ buyer, price }) {
    this.queue.push({ buyer, price });
  }

  initQueue() {
    this.queue = [];
  }
}

class Auction {
  constructor({ price, perPrice }) {
    this.price = price;
    this.perPrice = perPrice;
  }

  add() {
    this.price += this.perPrice;
  }
}

module.exports = { Auction, Manage, AuctionHouse };
