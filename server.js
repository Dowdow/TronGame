var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

var map = { 'width': 500, 'height': 500 };
var players = [];
var id = 0;
var vitesse = 2;
var playerleft = 0;
var start = false;
var colors = [ { 'color': '#0074D9', 'taken': false }, { 'color': '#FF4136', 'taken': false }, { 'color': '#FFDC00', 'taken': false }, { 'color': '#2ECC40', 'taken': false } ];

io.sockets.on('connection', function(socket) {

    var trailid = 1;
    var me = { 
     'id': id++,
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

    socket.on('join', function() {
        players[me.id] = me;
        if(!start) {
            playerleft++;
        }
        me.x = map.width / 2;
        me.y = map.height / 2;
        me.dx = 0;
        me.dy = 0;
        me.trails = [ { 'id': 1, 'x': map.width / 2, 'y': map.height / 2 } ];
        io.sockets.emit('newplayer', me);
    });

    socket.on('quit', function() {
        delete players[me.id];
        if(!me.destroy && start) {
            playerleft--;
        }
        io.sockets.emit('displayer', me.id);
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
        delete players[me.id];
        io.sockets.emit('chat', { 'player': me.name , 'message': 'vient de se déconnecter !'});
        io.sockets.emit('displayer', me.id);
    });
});

var timer = 0;
timer = setInterval(function() {
    if(start) {
        if(playerleft <= 1) {
            reset();
        } else {
            colliding();
            moving();
        }
    } else {
        if(playerleft > 1) {
            var timeout = setTimeout(function() {
                start = true;
                clearTimeout(timeout);
            }, 10000);
        }
    }
}, 16);

function reset() {
    start = false;
    playerleft = 0;
    for(var k in players) {
        if(players[k].hasOwnProperty(k)) {
            players[k].destroy = false;
            players[k].x = map.width / 2;
            players[k].y = map.height / 2;
            players[k].dx = 0;
            players[k].dy = 0;
            players[k].trails = [ { 'id': 1, 'x': map.width / 2, 'y': map.height / 2 } ];
            io.sockets.emit('newplayer', players[k]);
        }
    }   
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