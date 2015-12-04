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
var players = {};
var id = 0;
var vitesse = 2;
var playerleft;
var colors = [ { 'color': '#0074D9', 'taken': false }, { 'color': '#FF4136', 'taken': false }, { 'color': '#FFDC00', 'taken': false }, { 'color': '#2ECC40', 'taken': false } ];

io.sockets.on('connection', function(socket) {

    var trailid = 1;
    var me = { 
     'id': 'player' + id++,
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
        io.sockets.emit('newplayer', me);
    });

    socket.on('quit', function() {
        delete players[me.id];
        io.sockets.emit('displayer', me.id);
        me.x = map.width / 2;
        me.y = map.height / 2;
        me.dx = 0;
        me.dy = 0;
        me.trails = [ { 'id': 1, 'x': map.width / 2, 'y': map.height / 2 } ];
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
        if(typeof players[me.id] != 'undefined') {
            delete players[me.id];
            io.sockets.emit('chat', { 'player': me.name , 'message': 'vient de se déconnecter !'});
            io.sockets.emit('displayer', me.id);
        }
    });
});

var timer = 0;
timer = setInterval(function() {
    // Vérifie que quelqu'un a gagné
        // Si il ne reste que un joueur alors win
        // Reset de tout le monde
    // Vérifie les colisions
    colisions();    
}, 16);

function colisions() {
    for (var k in players) {
        if(players.hasOwnProperty(k)) {
            if(!players[k].destroy) {
                if(players[k].x + players[k].dx * vitesse - 8 <= 0
                || players[k].x + players[k].dx * vitesse + 8 >= map.width
                || players[k].y + players[k].dy * vitesse - 8 <=0
                || players[k].y + players[k].dy * vitesse + 8 >= map.height
                ) {
                    players[k].destroy = true;
                    io.sockets.emit('destroy', players[k].id);
                } else {
                    players[k].x += players[k].dx * vitesse;
                    players[k].y += players[k].dy * vitesse;
                    io.sockets.emit('move', { 'id': players[k].id, 'x': players[k].x, 'y': players[k].y, 'trails': players[k].trails });
                }
            }
        }
    }
}

http.listen(3000);