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
    status(content);
});

socket.on('pong', function() {
  latency = Date.now() - startTime;
  document.getElementById('ping').innerHTML = 'Ping : ' + latency + 'ms';
});

socket.on('reset', function() {
    players = [];
    status('En attente de joueurs ...');
});

socket.on('chat', function(message) {
    var p = document.createElement('p');
    p.innerHTML = message.player + ' : ' + message.message;
    var chat = document.getElementById('chat');
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
    if(chat.childNodes.length > 20) {
        chat.removeChild(chat.firstChild);
    }
});

function status(content) {
    var p = document.createElement('p');
    p.innerHTML = 'System : ' + content;
    p.className = 'system';
    var chat = document.getElementById('chat');
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
    if(chat.childNodes.length > 20) {
        chat.removeChild(chat.firstChild);
    }
}

document.getElementById('bouton-login').onclick = function(event) {
    event.preventDefault();
    var pseudo = document.getElementById('pseudo').value;
    if(pseudo != "") {
        socket.emit('login', pseudo.substring(0,30));
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

document.onkeydown = function (event) {
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
    if(x <= -0.75) {
        socket.emit('move', { 'dx': 1, 'dy': 0 });
    } else if(x >= 0.75) {
        socket.emit('move', { 'dx': -1, 'dy': 0 });
    } else if(y <= -0.25) {
        socket.emit('move', { 'dx': 0, 'dy': -1 });
    } else if(y >= 1) {
        socket.emit('move', { 'dx': 0, 'dy': 1 });
    } 
};  

var startTime;
setInterval(function() {
    startTime = Date.now();
    socket.emit('ping');
}, 2000);

var timer;
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
        var image = new Image();
        image.src = player.img;
        context.fillStyle = player.color;
        if(player.dx == 1 && player.dy == 0) {
            drawRotatedImage(image, player.x, player.y, 180);
        } else if(player.dx == -1 && player.dy == 0) {
            drawRotatedImage(image, player.x, player.y, 0);
        } else if(player.dx == 0 && player.dy == 1) {
            drawRotatedImage(image, player.x, player.y, -90);
        } else if(player.dx == 0 && player.dy == -1) {
            drawRotatedImage(image, player.x, player.y, 90);
        }
        context.font = '12px Roboto';
        context.fillText(player.name.substring(0,10), player.x -25, player.y - 25);
    }
}

var TO_RADIANS = Math.PI/180; 
function drawRotatedImage(image, x, y, angle) { 
    context.save(); 
    context.translate(x, y);
    context.rotate(angle * TO_RADIANS);
    context.drawImage(image, -20, -10, 40, 20);
    context.restore(); 
}

function drawTrail(point1, point2, color) {
    context.beginPath();
    context.moveTo(point1.x, point1.y);
    context.lineTo(point2.x, point2.y);
    context.lineWidth = 3;
    context.strokeStyle = color;
    context.stroke();
}