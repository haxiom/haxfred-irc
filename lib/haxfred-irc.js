var irc = require('irc');
var Haxfred;

var haxfred_irc = function(haxfred) {
  Haxfred = haxfred;
  Haxfred.irc = {};

  /*
   * isToHaxfred
   * This function returns a boolean for whether Haxfred is being directly addressed in the message.
   */
  function isToHaxfred(message) {
    console.log('Name:', Haxfred.irc.client.nick);
    var personalRegex = new RegExp('^' + Haxfred.irc.client.nick + '(:.*)');
    return personalRegex.test(message);
  };

  Haxfred.irc.say = function(message, channel) {
    channel = channel || Haxfred.config.channels[0];
    Haxfred.irc.client.say(channel, message);
  };

  /* ----- Haxfred Listeners ----- */
  haxfred.on('irc.pm', '', function(data, deferred) {
    haxfred.irc.say('thanks for thinking of me');
    deferred.resolve();
  });


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
    if (nick != Haxfred.irc.client.nick) {
      Haxfred.irc.say("Welcome " + nick + "!");
    }
  });

  Haxfred.irc.client.addListener('names', function(channel, nicks) {
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

  Haxfred.irc.client.addListener('message' + Haxfred.config.channels[0], function (from, message){
     if (isToHaxfred(message)) {
        haxfred.emit('irc.pm', {
           from: from,
           content: message,
           response: '',
           onComplete: function() {
             Haxfred.irc.say(this.response);
           }
        });
     } else {
        haxfred.emit('irc.message', {
           from: from,
           content: message,
           response: '',
           onComplete: function() {
             Haxfred.irc.say(this.response);
           }
        });
     }
  });
  console.log('irc was loaded');
};

module.exports = haxfred_irc;