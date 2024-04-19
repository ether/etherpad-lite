exports.handleClientMessage_shoutMessage = function (hook, context) {

  let date = new Date(context.payload.timestamp);

  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: 'Admin message',
    // (string | mandatory) the text inside the notification
    text: '[' + date.toLocaleTimeString() + ']: ' + context.payload.message,
    // (bool | optional) if you want it to fade out on its own or just sit there
    sticky: true
  });
}
