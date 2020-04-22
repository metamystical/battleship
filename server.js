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

const WebSocket = require('ws')
  
let port = 3333
const boardCon = []
let con = 0
let board = [[], []] // 0 = empty, 1 = part of a ship, 2 = a sunken part of a ship, 3 = a missed shot
let gameReady = false
let hitCount = [0, 0]
let turn = 0

const wss = new WebSocket.Server({ port: port })
wss.on('connection', (c) => {
  if (con === 2) { c.close(); return }
  const b = con++
  c.on('message', json => {
    const data = JSON.parse(json)
    if (data.type === 'init') {
      console.log('connected board: ' + b)
      boardCon[b] = c
      for (let i = 0; i < 10; i++) {
        board[b][i] = []
        for (let j = 0; j < 10; j++) {
          board[b][i][j] = 0
        }
      }
      const ship = [5, 4, 3, 3, 2] // ship lengths - biggest ship first
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
      if (con === 2) {
        for (let x = 0; x < 10; x++) {
          for (let y = 0; y < 10; y++) {
            const obj = { type: 'myShip', x: x, y: y }
            if (board[0][x][y] === 1) send(1, obj)
            if (board[1][x][y] === 1) send(0, obj)
          }
        }
        gameReady = true
        send(0, { type: 'ready' })
        send(1, { type: 'ready' })
      }
    }
    else if(data.type === 'click') {
      if (!gameReady || turn !== b) return
      const x = data.x; const y = data.y
      const target = b ? 0 : 1
      switch (board[b][x][y]) {
        case 0:
          board[b][x][y] = 3
          send(b, { type: 'theirMiss', x: x, y: y })
          send(target, { type: 'myMiss', x: x, y: y })
          break
        case 1:
          board[b][x][y] = 2
          send(b, { type: 'theirHit', x: x, y: y })
          send(target, { type: 'myHit', x: x, y: y })
          if (++hitCount[b] == 17) {
            send(b, { type: 'theirWin' })
            send(target, { type: 'myWin' })
            gameReady = false
          }
          break
        default:
          send(b, { type: 'theirWaste' })
      }
      turn = turn ? 0 : 1
    }
  })
  c.on('close', () => {
    console.log('closed board: ' + b)
    board[b] = []
    hitCount[b] = 0
    turn = 0
    if (--con > 0) boardCon[b ? 0 : 1].close()
  })
})
wss.on('listening', () => { console.log('listening on port ' + port) })
wss.on('error', (err) => { console.log('error: ' + err) })

function send (b, obj) { boardCon[b].send(JSON.stringify(obj)) }
function getRand (num) { return Math.floor(10 * Math.random()) % num }
