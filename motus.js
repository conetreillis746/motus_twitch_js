/**
 *  2 joueurs choisit aléatoirement
 *  confirmation des joueurs à être présent après le choix
 *
 *  Récupération de donnée depuis le tchat => traitement de données => affichage
 *  pour le moment : uniquement en local
 *  {
 *      Pour l'affichage => faire un système de page web par channel twitch ?
 *      si l'url est twitchtchat.motus.io
 *      twitchtchat.motus.io/conetreillis746 => rendu graphique et pour lancer le serveur : twitchtchat.motus.io avec une connexion a twitch
 *  }
 *
 */
function onlyUnique(value, index, array) {
  return array.indexOf(value) === index
}

class Motus {
  state = null
  listPlayer = []
  players = {
    yellow: [],
    blue: [],
  }
  maxTime = {
    // seconde
    selectorPlayer: 40,
    readyPlayer: 20,
    turnPlayer: 40,
  }
  timeWaitSleep = 333 // ms
  actualTime = []
  delimiter = '!'
  console = true
  equipe = false
  lastWord = null

  constructor() {
    var self = this
    setInterval(function () {
      Object.keys(self.maxTime).forEach((index) => {
        // let element = self.maxTime[index]
        if (!self.actualTime[index]) {
          self.actualTime[index] = -1
        }
        if (self.actualTime[index] > 0) {
          self.actualTime[index]--
          self.ShowTimer(self.actualTime[index], self.maxTime[index])
          $('.twitchTimer').css('opacity', '100%')
        }
        if (self.actualTime[index] === 0) {
          self.actualTime[index] = -1
          if (self.console) console.dir(index + ' => end time')
          switch (index) {
            case 'selectorPlayer':
              self.searchPlayer()
              break
            case 'readyPlayer':
              switch (this.state) {
                case 'notready':
                  txt =
                    "Tous les joueurs ne sont plus présent, la parti s'arrête !"
                  break
                case 'readyPlayer':
                  txt =
                    'Tous les joueurs doivent être prêt pour démarrer la partie'
                  break
              }
              self.returnError(txt)
              self.state = null
              break
            case 'turnPlayer':
              if (this.state == 'turn') {
                self.returnError(
                  "Si le joueur n'est plus présent, commande !notready pour demandé au joueurs de confirmé sa présence"
                )
              }
              break
          }
          $('#base-timer-label').html('-')
          $('.base-timer__path-remaining').addClass('green')
          $('.twitchTimer').css('opacity', '0%')
        }
      })
    }, 1000)
  }

  ShowTimer(actualTime, MaxTime) {
    let time = ((actualTime - 1) / MaxTime) * 283
    $('#base-timer-path-remaining').attr('stroke-dasharray', time + ' 283')
    $('#base-timer-label').html(this.formatTimeLeft(actualTime))
    $('.base-timer__path-remaining').removeClass('green orange red')
    let color = 'green'
    if (actualTime <= 5) {
      color = 'red'
    } else if (actualTime <= 15) {
      color = 'orange'
    }
    $('.base-timer__path-remaining').addClass(color)
  }

  formatTimeLeft(time) {
    // The largest round integer less than or equal to the result of time divided being by 60.
    const minutes = Math.floor(time / 60)

    // Seconds are the remainder of the time divided by 60 (modulus operator)
    let seconds = time % 60
    if (seconds < 10) {
      seconds = `0${seconds}`
    }
    if (minutes) return `${minutes}:${seconds}`
    else return seconds
  }

  returnError(txt) {
    this.MessageShow(txt, true)
    let tab = {
      type: 'infoGame',
      word: txt,
    }
    this.sendMessageApi(tab)
    if (this.console) console.log(txt)
  }

  randomPlayer() {
    let liste = []
    for (const i in this.listPlayer) {
      let player = this.listPlayer[i]
      liste.push(player.username)
      if (player.subscriber) {
        liste.push(player.username)
      }
    }
    let i = Math.floor(Math.random() * (liste.length - 1))
    return liste[i]
  }

  selectPlayer(username) {
    return {
      username: username,
      ready: false,
      turn: false,
      lastTurn: false,
    }
  }

  activePlayer(tags, turn) {
    let retour = false
    for (const index in this.players) {
      for (let i = 0; i < this.players[index].length; i++) {
        if (
          this.players[index][i].username == tags.username &&
          (!turn || (this.players[index][i].turn && turn))
        ) {
          retour = index
        }
      }
    }
    return retour
  }

  searchPlayer() {
    if (this.listPlayer.length > 0) {
      this.state = 'search-player'
      this.players['yellow'] = [this.selectPlayer(this.randomPlayer())]
      this.players['yellow'][0].turn = true
      let multijoueur = this.listPlayer.length > 2
      UpdateTeamSettings(multijoueur)
      if (multijoueur) {
        let getPlayer = []
        getPlayer.push(this.players['yellow'][0].username)
        this.players['blue'] = []
        let nbPlayer = this.equipe && this.listPlayer.length >= 4 ? 4 : 2 // nombre de joueur attendu
        while (getPlayer.length < nbPlayer) {
          let player = this.randomPlayer()
          if (getPlayer.indexOf(player) === -1) {
            // recherche de joueur différent
            getPlayer.push(player)
          }
        }
        for (i = 0; i < nbPlayer; i++) {
          this.players[i % 2 ? 'yellow' : 'blue'].push(
            this.selectPlayer(getPlayer[i])
          )
        }
        this.players['yellow'][0].turn = true
      } else {
        if (this.players['blue']) delete this.players['blue']
      }
      this.state = 'readyPlayer'
      this.actualTime.readyPlayer = this.maxTime.readyPlayer
      this.showReadyPlayer()
    } else {
      this.state = null
      this.returnError('Il faut au moins 1 joueur pour lancé la partie')
    }
  }

  async onGetMessage(message, tags) {
    if (message.substr(0, 1) == this.delimiter) {
      let params = message.substr(1).split(' ')
      if (this.console) console.dir(message)
      let tab
      // console.dir(params)
      switch (params[0]) {
        case 'notready':
          if (this.state == 'start') {
            this.actualTime.readyPlayer = this.maxTime.readyPlayer + 1
            this.state = 'notready'
          }
          break
        case 'ready': // check if players is ready
          if (this.state == 'readyPlayer' || this.state == 'notready') {
            let ready = true
            // set player to ready if in the list
            for (const team in this.players) {
              for (let i = 0; i < this.players[team].length; i++) {
                if (this.players[team][i].username == tags.username) {
                  this.players[team][i].ready = true
                }
                // check if all player is ready
                ready = ready && this.players[team][i].ready
              }
            }
            // all player is ready : start game
            if (ready) {
              if (this.state == 'readyPlayer') {
                this.startGame()
                this.state = 'start'
                this.actualTime.readyPlayer = -1
                $('.twitchTimer').css('opacity', '0%')
                this.showPlayerName()
                $('.twitchNbPlayer').css('display', 'none')
              }
              if (this.state == 'notready') {
              }
            } else {
              this.showReadyPlayer()
            }
          }
          break
        case 'play': // ajout du viewer dans la liste des joueurs
          if (this.state == 'select-player' || true) {
            let name = tags.username
            let player = this.listPlayer.find(function (value, index) {
              return value.username == name
            })
            if (!player) {
              this.listPlayer.push({
                username: name,
                subscriber: tags.subscriber,
              })
              this.showListePlayer()
            } else {
              // this.returnError(name + ' est déjà dans la liste des joueurs')
            }
          }
          break
        case 'selectPlayer': // lancement des inscriptions des joueurs
          if (
            tags.Master &&
            (this.state === null || params.indexOf('-f') !== -1)
          ) {
            this.equipe = params.indexOf('-e') !== -1
            this.listPlayer = []
            this.state = 'select-player'
            this.actualTime.selectorPlayer = this.maxTime.selectorPlayer + 1
          }
          break
        case 'word':
          let word = params[1]
          if (params.length > 2) {
            this.returnError('Aucun espace est autorisé')
          } else if (word.length === game.word_length) {
            let iPlayer = this.activePlayer(tags, true)
            console.dir(iPlayer)
            if (iPlayer && game.team_focus == iPlayer) {
              for (i = 0; i < word.length; i++) {
                setTimeout(function () {
                  AddLetter(word[i])
                }, i * this.timeWaitSleep)
              }
              setTimeout(function () {
                submitWord()
              }, (word.length + 1) * this.timeWaitSleep)
            }
          } else {
            this.returnError("Le mot n'est pas de la longueur requis")
            if (game.team_enabled == true) {
              switchTeamFocus()
            }
          }
          break
        case 'def':
          if (this.lastWord) {
            tab = {
              type: 'defWord',
              word: this.lastWord,
            }
            this.sendMessageApi(tab)
          }
          break
        case 'surrend':
          break
      }
    }

    // TODO : Save data : player : victory / played to show stats when new game begin or list player
    // TODO : Set word with text chat then if victory then or if not victory then =>
    // Check : 1 joueur ?
    // Check : 2 joueurs ?
    // Check : 2 équipe => 2 joueurs ?? (à voir)

    // (multijoueur :) Check if a player pass a round without response : check with ready if it already here, else forfait and stop the game
    // si équipe ? => trigger the player to inactif and pass it's turn (can rejoin the match with !ready)
    // si !surrend => trigger endGame with forfait avec révelation du mot
  }

  sendMessageApi(data) {}

  startGame() {
    initGame() // lancement de la partie
  }

  showPlayerName() {
    if ($('.player_score').length === 0) {
      $('#score_0_panel').append('<div class="player_score yellow"></div>')
      $('#score_1_panel').append('<div class="player_score blue"></div>')
    }
    var self = this

    for (const index in this.players) {
      let libelle = ''
      for (let i = 0; i < this.players[index].length; i++) {
        let player = this.players[index][i]
        libelle +=
          '<div class="player ' +
          (player.turn ? 'turn' : '') +
          '">' +
          player.username +
          '</div>'
      }
      $('.player_score.' + index).html(libelle)
    }
  }

  onEvent(name, data) {
    switch (name) {
      case 'victory':
        // if word is find : pickBall() 3 time with delay to show balls
        this.lastWord = game.word_to_find
        let timeShowBall = 2000
        let timeShowGrid = 3000
        for (let i = 0; i < game.try_picking_ball; i++) {
          // automatic pick ball
          setTimeout(function () {
            if (!game.motus_engaged) pickBall()
          }, (i + 1) * timeShowBall)
        }
        setTimeout(function () {
          if (!game.motus_engaged) pickBall()
        }, game.try_picking_ball * timeShowBall + timeShowGrid)
        break
      case 'notvictory':
        break
      case 'score':
        this.showPlayerName()
        break
      case 'switchTeamFocus':
        activeTeam = game.team_focus
        // active le tour du joueur qui n'a pas joué le tour d'avant

        for (let i = 0; i < this.players[activeTeam].length; i++) {
          this.players[activeTeam][i].turn = !this.players[activeTeam][i].turn
          if (this.players[activeTeam][i].turn) break
        }
        // sauvegarde le dernier qui a joué et enleve le role joueur actif
        let other_team = activeTeam == 'yellow' ? 'blue' : 'yellow'
        for (const i of this.players[other_team]) {
          this.players[other_team][i].lastturn = player.turn
          this.players[other_team][i].turn = false
        }
        this.showPlayerName()
        break
      case 'errorHandler':
        this.ErrorDisplay(data.message)
        break
    }
  }

  ErrorDisplay(message) {
    let tab = {
      type: 'infoGame',
      word: message,
    }
    this.sendMessageApi(tab)
  }

  MessageShow(message, time) {
    $('#popupUp').html(message)
    $('#popupUp').addClass('down')
    if (time) {
      setTimeout(function () {
        $('#popupUp').removeClass('down')
      }, 100 * message.length + 3000)
    }
  }

  MessageHidden() {
    $('#popupUp').removeClass('down')
  }

  showReadyPlayer() {
    let libelle = { yellow: 'Jaune', blue: 'Bleu' }
    let color = { yellow: 'yellow', blue: 'blue' }
    let header = '<table cellspacing="25"><thead><tr>'
    let html = ''
    for (const team in this.players) {
      header += '<th>' + libelle[team] + '</th>'
      let playerName = ''
      for (let i = 0; i < this.players[team].length; i++) {
        let player = this.players[team][i]
        playerName +=
          '<div class="name_player ' +
          (player.ready ? 'ready' : 'notready') +
          '">' +
          player.username +
          '</div>'
      }
      html += '<td>' + playerName + '</td>'
    }
    header += '</tr></thead>'
    html = header + '<tbody><tr>' + html + '</tr></tbody></table>'
    $('.twitchNbPlayer').html(html)
    $('.twitchNbPlayer').css('display', 'block')
  }

  showListePlayer() {
    let nb_player = this.listPlayer.length
    let tranche_affiche = 10
    let tranche = []
    for (let i = 0; i < nb_player; i = i + tranche_affiche) {
      tranche[(i / tranche_affiche) % 4] = i
    }
    let html =
      '<span class="totalInscrit">Total Inscrit : ' +
      nb_player +
      '</span><br><table cellspacing="25">'
    for (const index in tranche) {
      let idebut = tranche[index]
      html += '<td valign="top">'
      for (let i = idebut; i < idebut + tranche_affiche; i++) {
        if (this.listPlayer[i])
          html +=
            '<div class="name_player ' +
            (this.listPlayer[i].subscriber ? 'subscriber' : '') +
            '">' +
            this.listPlayer[i].username +
            '</div>'
      }
      html += '</td>'
    }
    html += '</table>'
    $('.twitchNbPlayer').html(html)
    $('.twitchNbPlayer').css('display', 'block')
  }
}

export default Motus
