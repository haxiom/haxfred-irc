var irc = require('irc');
var Haxfred;

var haxfred_irc = function(haxfred) {
  Haxfred = haxfred;
  Haxfred.irc = {};

  Haxfred.irc.users = {};
  /*
   * isToHaxfred
   * This function returns a boolean for whether Haxfred is being directly addressed in the message.
   */
  function isToHaxfred(message) {
    var personalRegex = new RegExp('^' + Haxfred.irc.client.nick + '(:.*)');
    return personalRegex.test(message);
  };

  Haxfred.irc.say = function(message, channel) {
    channel = channel || Haxfred.config.channels[0];
    Haxfred.irc.client.say(channel, message);
  };

  /* ----- Nick Methods -----*/
  Haxfred.irc.defaultNickMethod = function(chatNicks, haxfredNicks) {
     haxfredNicks = haxfredNicks || Haxfred.config.nicks;
     
     for (var i = 0; i < haxfredNicks.length; i++) {
        var found = false;
        // Check to see if this Nick is already used
        for (var key in chatNicks) {
           if (haxfredNicks[i] == key) { found = true; }
        }
        // If not found, change Nick to that name
        if (!found) {
           return haxfredNicks[i];
        }
     }

     return '';
  }

  Haxfred.irc.randomNickMethod = function(chatNicks) {
      var randomNicks = Haxfred.config.nicks;
      randomNicks.sort(function() { return 0.5 - Math.random() });
      return Haxfred.irc.defaultNickMethod(chatNicks, randomNicks);    
  }

  // Determine the nick
  Haxfred.irc._currentNick = Haxfred.irc[ (Haxfred.config.nickMethod || 'default') + "NickMethod" ](Haxfred.irc._currentNick);
  Haxfred.irc.client = new irc.Client(Haxfred.config.server, Haxfred.irc._currentNick, {
    channels: Haxfred.config.channels
  });

  /* ----- Listeners ----- */
  Haxfred.irc.client.addListener('join', function (channel, nick) {
    // Add nick to array of users
    if(Haxfred.irc.users[channel]) {
      Haxfred.irc.users[channel].push(nick);
    }

     haxfred.emit('irc.join',{
        channel: channel,
        from: nick,
        content: ''
     });
  });

  Haxfred.irc.client.addListener('part', function (channel, nick) {
    // Remove nick to array of users
    var removeNick = Haxfred.irc.users[channel].indexOf(nick);
    if(removeNick > -1) {
      Haxfred.irc.users[channel].splice(removeNick, 1);
    }

     haxfred.emit('irc.part',{
        channel: channel,
        from: nick,
        content: ''
     });
  });

  Haxfred.irc.client.addListener('names', function(channel, nicks) {
    // Update the room with an array of users
    Haxfred.irc.users[channel] = [];
    for(var n in nicks) {
     Haxfred.irc.users[channel].push(n);
    }

     if (Haxfred.irc._currentNick != Haxfred.irc.client.nick) {
       var newNick = Haxfred.irc[ ( Haxfred.config.nickMethod || 'default' ) + "NickMethod" ](nicks);
       if (newNick) {
          Haxfred.irc._currentNick = newNick;
          Haxfred.irc.client.send('NICK', Haxfred.irc._currentNick);
          console.log("Tried to switch Nick to ",newNick);
          // @TODO: Need to write something that catches if nick fails to change (IE, because the nick was already in use in another room, or reserved)
       } else {
          console.log('Nick not reassigned');
       }
     }
  });

  Haxfred.irc.client.addListener('message' + Haxfred.config.channels[0], function (from, message, msgObj){
     if (isToHaxfred(message)) {
        haxfred.emit('irc.directMsg', {
           from: from,
           content: message,
           response: '',
           message: msgObj,
           onComplete: function() {
             Haxfred.irc.say(this.response);
           }
        });
     } else {
        haxfred.emit('irc.msg', {
           from: from,
           content: message,
           response: '',
           message: msgObj,
           onComplete: function() {
             Haxfred.irc.say(this.response);
           }
        });
     }
  });

  Haxfred.irc.client.addListener('pm', function( nick, message, msgObj){
     haxfred.emit('irc.privateMsg', {
        from: nick,
        content: message,
        response: '',
        message: msgObj,
        onComplete: function() {
          Haxfred.irc.say(this.response);
        }
     });
  });

  console.log('irc was loaded');
};

module.exports = haxfred_irc;
