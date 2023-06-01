import twitchMotus from './../motus.js'

window.twitchVar = new twitchMotus()
onEvent = function (name) {
  window.twitchVar.onEvent(name)
}

/**
 * Connection to serv with tchat twitch
 */
var conn = new WebSocket('ws://localhost:8080')
conn.onopen = function (e) {
  console.log('Connection established!')
}
conn.onmessage = async function (e) {
  var data = JSON.parse(e.data)
  if ($('#chat_message')) {
    $('#chat_message').append(data.message + '<br>')
  }
  // console.dir(data)
  if (data['type'] == 'emote-only') {
    $('.emote_twitch:not(.alreadySet)').each(function () {
      animateEmote(this)
    })
  } else {
    window.twitchVar.onGetMessage(data.message, data.tags)
  }
}

window.twitchVar.sendMessageApi = function (data) {
  conn.send(JSON.stringify(data))
}

// TODO : affichage liste des joueurs qui entre !play
var list_emotes = []
function animateEmote(x) {
  $(x).addClass('alreadySet')
  list_emotes.push({
    img: $(x),
    y: 0,
    x: Math.random() * window.innerWidth,
    velocityY: 0,
    velocityX: Math.random() - 0.5 * (Math.random() * 20),
  })
}

/*
    $(document).ready(function() {
        setInterval(function(){
            list_emotes.forEach(function(emote, index) {
                emote.img.css('top', emote.y + 'px').css('left', emote.x + 'px')
                emote.x += emote.velocityX
                if (emote.x < 0) {
                    emote.x*= -1
                    emote.velocityX*= -1
                }
                if (emote.x > window.innerWidth) {
                    emote.x-= window.innerWidth - emote.x
                    emote.x*= -1
                    emote.velocityX*= -1
                }
                emote.y += emote.velocityY
                if (emote.y > window.innerHeight) {
                    emote.y-= window.innerHeight - emote.y
                    emote.velocityY*= -1
                }
                emote.velocityX*=1.2
                emote.velocityY*=1.2
            })
        },200)
    })
*/
