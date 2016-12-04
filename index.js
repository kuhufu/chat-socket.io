// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var rooms = [];
var histories = [];

// 将message信息加入到指定roomid的历史纪录中
function addToHistory(roomid, messageInfo) {
  if (!histories[roomid]) {
    histories[roomid] = [];
  }
  while (histories[roomid].length > 100) {
    histories[roomid].shift();
  }
  histories[roomid].push(messageInfo);
}

// 将userInfo信息加入到指定roomid的room中
function addToRoom(roomid, userInfo) {
  if (!rooms[roomid]) {
    rooms[roomid] = [];
  }
  rooms[roomid].push(userInfo);
}

function removeFromRoom(roomid, uid) {
  if (!rooms[roomid]) { return; }
  for (let i = 0; i < rooms[roomid].length; i++) {
    if (rooms[roomid][i].uid == uid) {
      rooms[roomid].splice(i, 1);
      break;
    }
  }

  // 如果房间没人，清空此房间的历史聊天消息
  if(rooms[roomid].length == 0){
    histories[roomid] = []
  }
}

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// 路由静态文件
app.use(express.static(__dirname + '/public'));



io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    var roomid = socket.roomid;
    
    //将消息放入历史记录中
    addToHistory(roomid, {
      username: socket.username,
      uid: socket.id,
      message: data
    });

    socket.broadcast.to(roomid).emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (loginInfo) {
    if (addedUser) return;
    var username = loginInfo['username'];
    var roomid = loginInfo['roomid'];
    addToRoom(roomid, {
      uid: socket.id,
      username: username
    });

    //加入房间
    socket.join(roomid);

    // we store the username in the socket session for this client
    socket.username = username;
    socket.roomid = roomid;
    addedUser = true;
    socket.emit('login', {
      numUsers: rooms[roomid].length,
      onlineUsers: rooms[roomid],
      histories: histories[roomid]
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.to(roomid).emit('user joined', {
      username: socket.username,
      numUsers: rooms[roomid].length,
      uid: socket.id
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    var roomid = socket.roomid;
    socket.broadcast.to(roomid).emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    var roomid = socket.roomid;
    socket.broadcast.to(roomid).emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    var roomid = socket.roomid;
    removeFromRoom(roomid, socket.id)
    if (addedUser) {
      // echo globally that this client has left
      socket.broadcast.to(roomid).emit('user left', {
        username: socket.username,
        numUsers: rooms[roomid].length,
        uid: socket.id
      });
    }
  });
});