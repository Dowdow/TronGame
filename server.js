var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/font', express.static(__dirname + '/font'));
app.use('/img', express.static(__dirname + '/img'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

var map = { 'width': 500, 'height': 500 };
var players = [];
var vitesse = 2;
var playerleft = 0;
var start = false;
var colors = [ { 'color': '#0074D9', 'taken': false }, { 'color': '#FF4136', 'taken': false }, { 'color': '#FFDC00', 'taken': false }, { 'color': '#2ECC40', 'taken': false } ];

io.sockets.on('connection', function(socket) {

    var trailid = 1;
    var me = { 
     'x': map.width / 2,
     'y': map.width / 2,
     'dx': 0,
     'dy': 0,
     'trails': [ { 'id': trailid, 'x': map.width / 2, 'y': map.height / 2 } ],
     'destroy': false 
    };
    
    socket.on('login', function(name) {
        socket.emit('init', { 'map': map });
        me.name = name;
        me.color = colors[Math.floor(Math.random() * 4)].color;
        for(var k in players) {
            if(players.hasOwnProperty(k)) {
                socket.emit('newplayer', players[k]);
            }
        }
        io.sockets.emit('chat', { 'player': name , 'message': 'vient de se connecter !'});
    });

    socket.on('ready', function() {
        if(!players.hasOwnProperty(me.id) && !start) {
            me.destroy = false;
            me.x = map.width / 2;
            me.y = map.height / 2;
            me.dx = 0;
            me.dy = 0;
            me.trails = [ { 'id': 1, 'x': map.width / 2, 'y': map.height / 2 } ];
            me.id = players.push(me) - 1;
            playerleft++;
            io.sockets.emit('newplayer', me);
        }
    });

    socket.on('move', function(move) {
        if(me.dx == 0 && me.dy == 0) {
            me.dx = move.dx;
            me.dy = move.dy;
        }
        else if(move.dx != me.dx * -1 && move.dy != me.dy * -1 ) {
            me.dx = move.dx;
            me.dy = move.dy;
            me.trails.push({ 'id': trailid++, 'x': me.x, 'y': me.y });
        }
    });

    socket.on('chat', function(message) {
        io.sockets.emit('chat', { 'player': me.name , 'message': message});
    });

    socket.on('disconnect', function(){
        if(start) {
            me.destroy = true;
            playerleft--;
            io.sockets.emit('destroy', me.id);
        }
        if(typeof me.name != 'undefined') {
            io.sockets.emit('chat', { 'player': me.name , 'message': 'vient de se déconnecter !'});
        }
    });
});

var timer = 0;
timer = setInterval(function() {
    if(start) {
        if(playerleft <= 1) {
            io.sockets.emit('status', 'Celebrating !');
            var waiting = setTimeout(function() {
                reset();
                clearTimeout(waiting);
            }, 3000);
        } else {
            colliding();
            moving();
        }
    } else {
        if(playerleft > 1) {
            var timeout = setTimeout(function() {
                start = true;
                io.sockets.emit('status', 'Start !');
                clearTimeout(timeout);
            }, 10000);
        }
    }
}, 16);

function reset() {
    for(var k in players) {
        if(players.hasOwnProperty(k)) {
            delete players[k].id;
        }
    }
    playerleft = 0;
    start = false;
    players = [];
    io.sockets.emit('reset');
}

function moving() {
    for (var k in players) {
        if(players.hasOwnProperty(k)) {
            if(!players[k].destroy) {
                players[k].x += players[k].dx * vitesse;
                players[k].y += players[k].dy * vitesse;
                io.sockets.emit('move', players[k]);
            }
        }
    }
}

function colliding() {
    for (var k in players) {
        if(players.hasOwnProperty(k)) {
            if(!players[k].destroy) {
                if(players[k].x + players[k].dx * vitesse - 8 <= 0
                || players[k].x + players[k].dx * vitesse + 8 >= map.width
                || players[k].y + players[k].dy * vitesse - 8 <=0
                || players[k].y + players[k].dy * vitesse + 8 >= map.height
                ) {
                    destroy(players[k]);
                }
            }
        }
    }
}

function destroy(player) {
    player.destroy = true;
    playerleft--;
    io.sockets.emit('destroy', player.id);
}

http.listen(3000);