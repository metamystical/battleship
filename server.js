#!/usr/bin/env node

/* lazy way of tracking when the game is won: just increment hitCount on every hit
   in this version, and according to the official Hasbro rules (http://www.hasbro.com/common/instruct/BattleShip_(2002).PDF)
   there are 17 hits to be made in order to win the game:
      Carrier     - 5 hits
      Battleship  - 4 hits
      Destroyer   - 3 hits
      Submarine   - 3 hits
      Patrol Boat - 2 hits
*/
// 0 = empty, 1 = part of a ship, 2 = a sunken part of a ship, 3 = a missed shot

const WebSocket = require('ws')

function getRand (num) { return Math.floor(10 * Math.random()) % num }
  
let board
let turn
let hitCount
let gameReady = false

let port = 3333
const ship = [5, 4, 3, 3, 2] // ship lengths - biggest ship first

function layout () {
  board = [[], []]
  for (let b = 0; b < 2; b++) {
    for (let i = 0; i < 10; i++) {
      board[b][i] = []
      for (let j = 0; j < 10; j++) {
        board[b][i][j] = 0
      }
    }
    for (let i = 0; i < ship.length; i++) {
      while (true) {
        const x = getRand(10) // ship end location - vertical coordinate
        const y = getRand(10) // ship end location - horizontal coordinate
        const vert = getRand(2) // ship is vertical or horizontal
        const pos = getRand(2) ? 1 : -1 // ship end is upper left or lower right
        const length = ship[i]
        let j
        for (j = 0; j < length; j++) { // check for conflict
          let xx = x; let yy = y
          if (vert) xx += j * pos
          else yy += j * pos
          if (xx < 0 || xx > 9 || yy < 0 || yy > 9 || board[b][xx][yy]) break
        }
        if (j !== length) continue // conflict - try again
        for (let j = 0; j < length; j++) { // place ship
          let xx = x; let yy = y
          if (vert) xx += j * pos
          else yy += j * pos
          board[b][xx][yy] = 1
        }
        break
      }
    }
  }
  turn = 0
  hitCount = [0, 0]
}

start()
function start() {
  const wss = new WebSocket.Server({ port: port })
  wss.on('listening', () => { console.log('listening on port ' + port) })
  wss.on('error', (err) => { console.log(err) })
  const con = []
  wss.on('connection', (c) => {
    con.push(c)
    if (con.length > 2) { c.close(); return }
    c.on('message', json => {
      const data = JSON.parse(json)
      if (data.type === 'init') {
        console.log('connected board: ' + (con.length - 1))
        if (con.length === 2) {
          if (!gameReady) layout()
          for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 10; y++) {
              for (let b = 0; b < 2; b++) {
                if (board[b][x][y]) {
                  send(b, { type: 'grid', s: 1, x: x, y: y, z: board[b][x][y] })
                  if (board[b][x][y] > 1) send(b ? 0 : 1, { type: 'grid', s: 0, x: x, y: y, z: board[b][x][y] })
                }
              }
            }
          }
          gameReady = true
          send(0, { type: 'ready' })
          send(1, { type: 'ready' })
        }
      }
      else if(data.type === 'click') {
        if (!gameReady) return
        const source = (con[0] === c ? 0 : 1)
        if (turn !== source) return
        const target = (con[0] === c ? 1 : 0)
        const x = data.x; const y = data.y
        switch (board[target][x][y]) {
          case 0:
            board[target][x][y] = 3
            send(target, { type: 'miss', s: 1, x: x, y: y })
            send(source, { type: 'miss', s: 0, x: x, y: y })
            break
          case 1:
            board[target][x][y] = 2
            send(target, { type: 'hit', s: 1, x: x, y: y })
            send(source, { type: 'hit', s: 0, x: x, y: y })
            if (++hitCount[target] == 17) {
              send(target, { type: 'theirWin' })
              send(source, { type: 'myWin' })
              gameReady = false
              layout()
            }
            break
          default:
            send(source, { type: 'waste' })
        }
        turn = turn ? 0 : 1
      }
    })
    c.on('close', () => {
      let b
      for (b = 0; b < 2; b++) { if (con[b] === c) break }
      if (b === 2) return
      con[b] = null
      if (con[b ? 0 : 1]) con[b ? 0 : 1].close()
      else wss.close()
    })
  })
  wss.on('close', () => { setImmediate(start) })
  function send (b, obj) { con[b].send(JSON.stringify(obj)) }
}
