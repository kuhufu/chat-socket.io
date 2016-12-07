const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const port = process.env.PORT || 3000

server.listen(port, function () {
  console.log('Server listening at port %d', port)
})

// 路由静态文件
app.use(express.static(__dirname + '/public'))

const rooms = []
const histories = []

// 将message加入到指定roomid的历史纪录中
function addToHistory(roomid, messageInfo) {
  // 如果房间聊天历史记录不存在，则创建历史记录列表
  if(!histories[roomid]){
     histories[roomid] = []
  }
  var history = histories[roomid]
  while (history.length > 100) {
    history.shift()
  }
  history.push(messageInfo)
}

// 将用户信息加入到指定roomid的room中
function addToRoom(roomid, userInfo) {
  // 如果房间用户列表不存在，则创建房间
  if(!rooms[roomid]){
    rooms[roomid] = []
  }
  rooms[roomid].push(userInfo)
}

// 将离开聊天室的用户从room中移除
function removeFromRoom(roomid, uid) {
  var room = rooms[roomid]
  if (!room) { return; }
  for (let i = 0; i < room.length; i++) {
    if (room[i].uid == uid) {
      room.splice(i, 1)
      break
    }
  }
  cleanHistories(roomid)
}

// 如果房间没人，清空此房间的历史聊天消息 and 删除此房间
function cleanHistories(roomid) {
  if (rooms[roomid].length == 0) {
    console.log('clean histories and delete room: ' + roomid)
    delete histories[roomid]
    delete rooms[roomid]
  }
}

<<<<<<< HEAD
// 每隔24小时检查房间，如果房间没人则删除房间
const CLEAN_TIME = 10 * 1000
setInterval(function () {
  for (i in rooms) {
    if (rooms[i].length == 0) {
      console.log('delete room: ' + i)
      delete (rooms[i])
    }
  }
}, CLEAN_TIME)

=======
>>>>>>> origin/master
io.on('connection', function (socket) {
  var addedUser = false

  // when the client emits 'newMessage', this listens and executes
  socket.on('newMessage', function (data) {
    var roomid = socket.roomid

    //将消息放入历史记录中
    addToHistory(roomid, {
      username: socket.username,
      uid: socket.id,
      message: data
    })

    socket.broadcast.to(roomid).emit('newMessage', {
      username: socket.username,
      message: data
    })
  })

  // when the client emits 'addUser', this listens and executes
  socket.on('addUser', function (loginInfo) {
    if (addedUser) return
    var username = loginInfo['username']
    var roomid = 'r_' + loginInfo['roomid'];  // 将数组索引转化为字符串，而非有可能出现的数字
    addToRoom(roomid, {
      uid: socket.id,
      username: username
    })

    //加入房间
    socket.join(roomid)

    // we store the username in the socket session for this client
    socket.username = username
    socket.roomid = roomid
    addedUser = true
    socket.emit('login', {
      onlineUsers: rooms[roomid],
      histories: histories[roomid]
    })
    // echo globally (all clients) that a person has connected
    socket.broadcast.to(roomid).emit('userJoined', {
      username: socket.username,
      uid: socket.id
    })
  })

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    var roomid = socket.roomid
    socket.broadcast.to(roomid).emit('typing', {
      username: socket.username
    })
  })

  // when the client emits 'stopTyping', we broadcast it to others
  socket.on('stopTyping', function () {
    var roomid = socket.roomid
    socket.broadcast.to(roomid).emit('stopTyping', {
      username: socket.username
    })
  })

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    var roomid = socket.roomid
    removeFromRoom(roomid, socket.id)
    if (addedUser) {
      socket.broadcast.to(roomid).emit('userLeft', {
        username: socket.username,
        uid: socket.id
      })
    }
<<<<<<< HEAD
  });
});
=======
  })
})
>>>>>>> origin/master
