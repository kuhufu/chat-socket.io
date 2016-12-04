$(function () {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $roomidInput = $('#roomid');
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var connected = false
  var typing = false
  var connecanUseNewAPI = false;
  var tycanUseNewAPI = false;
  var lastTypingTime;
  var $currentInput// = $usernameInput.focus();

  var socket = io();

  function updateUserList(users) {
    users.forEach((data) => {
      $('#users').append($('<li id="' + data.uid + '">' + data.username + '</li>'));
    })
    var size = $('#users').children().length;
    $('#onlineNum').text(size);
  }

  function readHistory(histories) {
    histories.forEach((data) => {
      addChatMessage(data)
    })
  }

  // Sets the client's username and room id
  function setLoginInfo() {
    username = cleanInput($usernameInput.val().trim());
    roomid = cleanInput($roomidInput.val().trim());
    // If the username and roomid is valid
    if (username && roomid) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', {
        username: username,
        roomid: roomid
      });
    }
  }

  // Sends a chat message
  function sendMessage() {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message,
      }, 'me');
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log(message, options) {
    notify('', message)
  }

  function notify(title, message) {
    if ('Notification' in window) {
      Notification.requestPermission(function (status) {
        //status默认值'default'等同于拒绝 'denied' 意味着用户不想要通知 'granted' 意味着用户同意启用通知
        if ("granted" == status) {
          notifyByNewAPI('', message)
        } else {
          notifyByElement(message)
        }
      });
    }
  }

  // 通过html5中的桌面消息api进行通知
  function notifyByNewAPI(title, message) {
    var n = new Notification(title, {
      body: message,
      icon: "../image/head.png"
    });

    n.onshow = function () {
      console.log('Notification showed')
      setTimeout(() => {
        n.close()
      }, 2000)
    }

    n.onclick = function () {
      console.log('Notification clicked')
      n.close()
    }
    n.onerror = function () {
      console.log("Notification encounter a error");
    }
    n.onclose = function () {
      console.log("Notification is closed");
    }
  }

  // 通过在页面添加元素进行通知
  function notifyByElement(message) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el);
  }

  // 将消息添加到消息列表
  function addChatMessage(data, messageFrom, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    messageFrom = messageFrom || '';
    if ($typingMessages.length !== 0) {
      options.canUseNewAPI = false;
      $typingMessages.remove();
    }
    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .addClass(messageFrom)

    if (messageFrom) {
      $messageDiv.append($messageBodyDiv);
    } else {
      $messageDiv.append($usernameDiv, $messageBodyDiv);
    }

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (defcanUseNewAPI = false)
  function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.precanUseNewAPI = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput(input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          typing = false
          socket.emit('stop typing');
          tycanUseNewAPI = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages(data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor(username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events
  $window.keydown(function (event) {
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        tycanUseNewAPI = false;
      } else {
        setLoginInfo();
      }
    }
  });

  $inputMessage.on('input', function () {
    updateTyping();
  });


  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    updateUserList(data.onlineUsers);
    readHistory(data.histories);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    updateUserList([{
      uid: data.uid,
      username: data.username
    }])
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    removeChatTyping(data);
    var uid = '#' + data.uid;
    $(uid).remove();
    updateUserList([])
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });
});

$(document).ready(function () {
  $('#roomid').val('1')
})