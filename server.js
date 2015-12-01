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
var colors = [ { 'color': '#0074D9', 'taken': false }, { 'color': '#FF4136', 'taken': false }, { 'color': '#FFDC00', 'taken': false }, { 'color': '#2ECC40', 'taken': false } ];

io.sockets.on('connection', function(socket) {

    var me = { 'id': 'player' + id++, 'x': map.width / 2, 'y': map.width / 2, 'dx': 0, 'dy': 0, 'trails': [ { 'id': 1, 'x': map.width / 2, 'y': map.height / 2 } ] };
    var trailid = 1;

    socket.on('login', function(name) {
        socket.emit('init', { 'map': map });
        me.name = name;
        me.color = colors[Math.floor(Math.random() * 4)].color;
        for(var k in players) {
            if(players.hasOwnProperty(k)) {
                socket.emit('newplayer', players[k]);
            }
        }
        players[me.id] = me;
        io.sockets.emit('newplayer', me);
        io.sockets.emit('chat', { 'player': name , 'message': 'vient de se connecter !'});
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
    for (var k in players) {
        if(players.hasOwnProperty(k)) {
            if(players[k].x + players[k].dx * vitesse - 10 <= 0
            || players[k].x + players[k].dx * vitesse + 10 >= map.width
            || players[k].y + players[k].dy * vitesse - 10 <=0
            || players[k].y + players[k].dy * vitesse + 10 >= map.height
            ) {
                io.sockets.emit('move', { 'id': players[k].id, 'x': players[k].x, 'y': players[k].y });
            } else {
                players[k].x += players[k].dx * vitesse;
                players[k].y += players[k].dy * vitesse;
                io.sockets.emit('move', { 'id': players[k].id, 'x': players[k].x, 'y': players[k].y, 'trails': players[k].trails });
            }
        }
    }
}, 16);

http.listen(3000);