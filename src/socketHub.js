let ioRef;

function attachSocket(io) {
  ioRef = io;
}

function getSocket() {
  return ioRef;
}

module.exports = { attachSocket, getSocket };
