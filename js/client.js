var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var socket = io.connect();
var players = [];
var launch = false;

socket.on('init', function(object) {
    canvas.width = object.map.width;
    canvas.height = object.map.height;
});

socket.on('newplayer', function(player) {
    players[player.id] = player;
});

socket.on('displayer', function(id) {
    delete players[id];
});

socket.on('move', function(player) {
    if(launch) {
        players[player.id] = player;
    }
});

socket.on('destroy', function(id) {
    players[id].destroy = true;
});

socket.on('status', function(content) {
    document.getElementById('status').innerHTML = content;
});

socket.on('reset', function() {
    players = [];
    document.getElementById('status').innerHTML = 'En attente de joueurs ...';
});

socket.on('chat', function(message) {
    var p = document.createElement('p');
    p.innerHTML = message.player + ' : ' + message.message;
    var chat = document.getElementById('chat');
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
});

document.getElementById('bouton-login').onclick = function(event) {
    event.preventDefault();
    var pseudo = document.getElementById('pseudo').value;
    if(pseudo != "") {
        socket.emit('login', pseudo);
        launch = true;
        document.getElementById('login').style.display = 'none';
        document.getElementById('content').style.display = 'inline-block';
    }
};

document.getElementById('bouton-ready').onclick = function(event) {
    event.preventDefault();
    socket.emit('ready');
};

document.getElementById('bouton-chat').onclick = function(event) {
    event.preventDefault();
    var text = document.getElementById('text').value;
    if(text != "") {
        socket.emit('chat', text);
        document.getElementById('text').value = '';
    }
};

document.onkeypress = function (event) {
    switch (event.keyCode) {
        case 37:
            socket.emit('move', { 'dx': -1, 'dy': 0 });
            break;
        case 38:
            socket.emit('move', { 'dx': 0, 'dy': -1 });
            break;
        case 39:
            socket.emit('move', { 'dx': 1, 'dy': 0 });
            break;
        case 40:
            socket.emit('move', { 'dx': 0, 'dy': 1 });
            break;
    }
};

window.ondevicemotion = function(event) {
    var x = event.accelerationIncludingGravity.x;
    var y = event.accelerationIncludingGravity.y;  
    if(x <= -1) {
        socket.emit('move', { 'dx': 1, 'dy': 0 });
    } else if(x >= 1) {
        socket.emit('move', { 'dx': -1, 'dy': 0 });
    } else if(y <= -0.5) {
        socket.emit('move', { 'dx': 0, 'dy': -1 });
    } else if(y >= 1.5) {
        socket.emit('move', { 'dx': 0, 'dy': 1 });
    } 
};  

var timer = 0;
timer = setInterval(function() {
    if (launch) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        for (var k in players) {
            if(players.hasOwnProperty(k)) {
                drawPlayer(players[k]);
            }
        }
    }
}, 16);

function drawPlayer(player) {
    var temp;
    for (var k in player.trails) {
        if(player.hasOwnProperty('trails')) {
            if(player.trails[k] != player.trails[0]) {
                drawTrail(player.trails[k], temp, player.color);
            }
            temp = player.trails[k];
            if(player.trails[k] == player.trails[player.trails.length -1]) {
                drawTrail(player.trails[k], { 'id': 0, 'x': player.x, 'y': player.y }, player.color);
            }
        }
    }
    if(!player.destroy) {
        context.beginPath();
        context.arc(player.x, player.y, 10, 0, Math.PI * 2, true);
        context.strokeStyle = "#111111";
        context.fillStyle = player.color;
        context.fill();
        context.lineWidth = 1;
        context.stroke();
    }
}

function drawTrail(point1, point2, color) {
    context.beginPath();
    context.moveTo(point1.x, point1.y);
    context.lineTo(point2.x, point2.y);
    context.lineWidth = 3;
    context.strokeStyle = color;
    context.stroke();
}