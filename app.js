// Require necessary node modules
// Make the variables inside the .env element available to our Node project
require('dotenv').config()

const tmi = require('tmi.js')

const ws = require('ws')

// Setup connection configurations
// These include the channel, username and password
const client = new tmi.Client({
  options: { debug: true, messagesLogLevel: 'info' },
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: {
    username: `${process.env.TWITCH_USERNAME}`,
    password: 'oauth:' + `${process.env.TWITCH_OAUTH}`,
  },

  // Lack of the identity tags makes the bot anonymous and able to fetch messages from the channel
  // for reading, supervision, spying, or viewing purposes only
  channels: [`${process.env.TWITCH_CHANNEL}`],
})

// Connect to the channel specified using the setings found in the configurations
// Any error found shall be logged out in the console
client.connect().catch(console.error)

// We shall pass the parameters which shall be required
client.on('message', (channel, tags, message, self) => {
  // Lack of this statement or it's inverse (!self) will make it in active
  if (self) return
  // This logs out all the messages sent on the channel on the terminal
  sendData(tags, message)
})

const axios = require('axios')

const wss = new ws.WebSocketServer({ port: 8080 })

var sendData = function () {}

var list_message = []
var MessageToChat = function (text) {
  list_message.push(text)
}

const IntervalMessage = setInterval(function message() {
  if (list_message[0]) {
    client.say(`${process.env.TWITCH_CHANNEL}`, list_message.shift())
  }
}, 750)

wss.on('connection', function connection(ws) {
  ws.isAlive = true
  ws.on('error', console.error)
  ws.on('pong', heartbeat)
  function heartbeat() {
    this.isAlive = true
  }

  ws.on('message', async function message(message) {
    console.log('received: %s', message)
    try {
      data = JSON.parse(message)
      switch (data.type) {
        case 'infoGame':
          MessageToChat(data.message)
          break
        case 'defWord':
          const options = {
            method: 'GET',
            url:
              'https://dicolink.p.rapidapi.com/mot/' +
              data.word +
              '/definitions',
            headers: {
              'X-RapidAPI-Key': `${process.env.RapidAPIKey}`,
              'X-RapidAPI-Host': 'dicolink.p.rapidapi.com',
            },
          }
          try {
            const response = await axios.request(options)
            let source = 'Source : ' + response.data[0].source
            let def = data.word + ' : ' + response.data[0].definition
            MessageToChat(source)
            MessageToChat(def)
          } catch (error) {
            console.error(error)
          }
          break
        default:
          console.log('default')
          break
      }
    } catch (e) {
      console.log(e)
    }
  })
  sendData = function (tags, message) {
    var data = {
      type: tags['emote-only'] ? 'emote-only' : '',
      tags: {
        username: tags.username,
        subscriber: tags.subscriber,
        Master: tags.username == `${process.env.TWITCH_CHANNEL}`,
      },
      message: getMessageHTML(message, tags.emotes),
    }
    ws.send(JSON.stringify(data))
  }
})

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate()
    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', function close() {
  clearInterval(interval)
  console.log('serveur down! restart the page')
})

function getMessageHTML(message, emotes) {
  if (!emotes) return message

  // store all emote keywords
  // ! you have to first scan through
  // the message string and replace later
  const stringReplacements = []

  // iterate of emotes to access ids and positions
  Object.entries(emotes).forEach(([id, positions]) => {
    // use only the first position to find out the emote key word
    const position = positions[0]
    const [start, end] = position.split('-')
    const stringToReplace = message.substring(
      parseInt(start, 10),
      parseInt(end, 10) + 1
    )

    stringReplacements.push({
      stringToReplace: stringToReplace,
      replacement: `<img class='emote_twitch' src="https://static-cdn.jtvnw.net/emoticons/v1/${id}/3.0">`,
    })
  })

  // generate HTML and replace all emote keywords with image elements
  const messageHTML = stringReplacements.reduce(
    (acc, { stringToReplace, replacement }) => {
      // obs browser doesn't seam to know about replaceAll
      return acc.split(stringToReplace).join(replacement)
    },
    message
  )

  return messageHTML
}
