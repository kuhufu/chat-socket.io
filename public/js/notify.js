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