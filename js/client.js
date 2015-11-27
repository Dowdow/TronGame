var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var socket = io.connect('http://195.221.42.98:3000');
var players = {};
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

socket.on('move', function(move) {
    if(launch) {
        players[move.id].x = move.x;
        players[move.id].y = move.y;
    }
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
    socket.emit('login', document.getElementById('pseudo').value);
    launch = true;
    document.getElementById('login').style.display = 'none';
    document.getElementById('content').style.display = 'inline-block';
};

document.getElementById('bouton-chat').onclick = function(event) {
    event.preventDefault();
    socket.emit('chat', document.getElementById('text').value);
    document.getElementById('text').value = '';
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
    context.beginPath();
    context.arc(player.x, player.y, 10, 0, Math.PI * 2, true);
    context.strokeStyle = "#111111";
    context.fillStyle = "#0074D9";
    context.fill();
    context.stroke();
}

function drawTrail(player) {

}