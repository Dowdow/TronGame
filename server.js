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
var cooldown = true;
var colors = [
    { 'color': '#0074D9', 'taken': 0, 'x': 50, 'y': 250 },
    { 'color': '#FF4136', 'taken': 0, 'x': 450, 'y': 250 },
    { 'color': '#FFDC00', 'taken': 0, 'x': 250, 'y': 50 }, 
    { 'color': '#2ECC40', 'taken': 0, 'x': 250, 'y': 450 } ];

io.sockets.on('connection', function(socket) {

    var trailid = 1;
    var me = {
     'dx': 0,
     'dy': 0,
     'destroy': false
    };
    
    socket.on('login', function(name) {
        socket.emit('init', { 'map': map });
        me.name = name;
        for(var k in players) {
            if(players.hasOwnProperty(k)) {
                socket.emit('newplayer', players[k]);
            }
        }
        io.sockets.emit('chat', { 'player': name , 'message': 'vient de se connecter !'});
    });

    socket.on('ready', function() {
        if(!players.hasOwnProperty(me.id) && !start) {
            for (var k in colors) {
                if(colors.hasOwnProperty(k)) {
                    if(colors[k].taken == 0) {
                        colors[k].taken = 1;
                        me.color = colors[k].color;
                        me.x = colors[k].x;
                        me.y = colors[k].y;
                        me.dx = 0;
                        me.dy =  0;
                        me.destroy = false;
                        me.trails = [ { 'id': 1, 'x': colors[k].x, 'y': colors[k].y } ];
                        me.id = players.push(me) - 1;
                        playerleft++;
                        io.sockets.emit('newplayer', me);
                        break;
                    }
                }
            }
        }
    });

    socket.on('move', function(move) {
        if(players.hasOwnProperty(me.id) && start) {
            if(me.dx == 0 && me.dy == 0) {
                me.dx = move.dx;
                me.dy = move.dy;
            }
            else if(move.dx != me.dx * -1 && move.dy != me.dy * -1 ) {
                me.dx = move.dx;
                me.dy = move.dy;
                me.trails.push({ 'id': trailid++, 'x': me.x, 'y': me.y });
            }
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
        if(playerleft <= 1 && !cooldown) {
            cooldown = true;
            io.sockets.emit('status', getWinner() + ' remporte la partie !');
            var waiting = setTimeout(function() {
                reset();
                clearTimeout(waiting);
            }, 3000);
        } else {
            colliding();
            moving();
        }
    } else {
        if(playerleft > 1 && cooldown) {
            cooldown = false;
            io.sockets.emit('status', 'La partie démarre dans 10 secondes !');
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
    for(var k in colors) {
        if(colors.hasOwnProperty(k)) {
            colors[k].taken = 0;
        }
    }
    playerleft = 0;
    start = false;
    players = [];
    io.sockets.emit('reset');
}

function getWinner() {
    for (var k in players) {
        if(players.hasOwnProperty(k)) {
            if(!players[k].destroy) {
                return players[k].name;
            }
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
    for (var i in players) {
        if(players.hasOwnProperty(i)) {
            if(!players[i].destroy) {
                if(players[i].x + players[i].dx * vitesse - 8 <= 0
                || players[i].x + players[i].dx * vitesse + 8 >= map.width
                || players[i].y + players[i].dy * vitesse - 8 <=0
                || players[i].y + players[i].dy * vitesse + 8 >= map.height
                ) {
                    destroy(players[i]);
                } else {
                    var temp;
                    for (var j in players[i].trails) {
                        if(players[i].trails.hasOwnProperty(j)) {
                            var trail = players[i].trails[j];
                            var contactx = 1;
                            var contacty = 1;
                            for (var k in players) {
                                if(players.hasOwnProperty(k)) {
                                    if(players[i].trails[j] != players[i].trails[0]) {
                                        contactx = trail.x - temp.x;
                                        contacty = trail.y - temp.y;
                                    }
                                    temp = trail;
                                    if(players[i].trails[j] == players[i].trails[players[i].trails.length -1]) {
                                        contactx = trail.x - players[k].x;
                                        contacty = trail.y - players[k].y;
                                    }
                                    if(contactx == 0) {
                                        if(players[k].dx > 0) {
                                            if(players[k].x + players[k].dx * vitesse + 8 >= trail.x) {
                                                destroy(players[k]);
                                                console.log('Colision a droite !' + players[k].x + " " + trail.x);
                                            }
                                        } else if (players[k].dx < 0) {
                                            if(players[k].x + players[k].dx * vitesse - 8 <= trail.x) {
                                                destroy(players[k]);
                                                console.log('Colision a gauche !');
                                            }
                                        }
                                    } else if(contacty == 0) {
                                        if(players[k].dx > 0) {
                                            if(players[k].y + players[k].dy * vitesse + 8 >= trail.y) {
                                                destroy(players[k]);
                                                console.log('Colision en bas !');
                                            }
                                        } else if (players[k].dx < 0) {
                                            if(players[k].y + players[k].dy * vitesse - 8 <= trail.y) {
                                                destroy(players[k]);
                                                console.log('Colision en haut !');
                                            }
                                        }
                                    }
                                }
                            }   
                        }
                    }
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