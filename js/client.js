/* ============================
   Initialisation des variables
   ============================ */

var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var socket = io.connect();
var players = [];
var launch = false;
var announce = '';
var joystick = document.getElementById('joystick');

/* ========================================
   Gestion des interactions avec le serveur
   ======================================== */

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

socket.on('loud', function(message) {
    announce = message;
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

/* ==========================================
   Gestion des interactions avec l'utlisateur
   ==========================================  */

document.getElementById('bouton-login').onclick = function(event) {
    event.preventDefault();
    var pseudo = document.getElementById('pseudo').value;
    if(pseudo != "") {
        socket.emit('login', pseudo.substring(0,30));
        launch = true;
        document.getElementById('login').style.display = 'none';
        document.getElementById('content').style.display = 'inline-block';
        joystick.style.width = context.canvas.scrollWidth + 'px';
        joystick.style.height = context.canvas.scrollWidth + 'px';
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

var hide = true;
document.getElementById('bouton-hide').onclick = function(event) {
  if(hide) {
    document.getElementById('div-chat').style.display = 'block';
    hide = false;
  } else {
    document.getElementById('div-chat').style.display = 'none';
    hide = true;
  }
};

var accelero = false;
document.getElementById('bouton-device').onclick = function(event) {
    if(accelero) {
        joystick.style.display = 'block';
        accelero = false;
    } else {
        joystick.style.display = 'none';
        accelero = true;
    }
}

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
    if(!accelero) {
        return;
    } 
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

var manager = nipplejs.create({
    zone: document.getElementById('joystick'),
    color: '#DF740C'
});

manager.on('added', function (evt, nipple) {
    nipple.on('dir', function (evt) {
        switch(evt.target.direction.angle) {
            case 'up':
                socket.emit('move', { 'dx': 0, 'dy': -1 });
                break;
            case 'down':
                socket.emit('move', { 'dx': 0, 'dy': 1 });
                break;
            case 'left':
                socket.emit('move', { 'dx': -1, 'dy': 0 });
                break;
            case 'right':
                socket.emit('move', { 'dx': 1, 'dy': 0 });
                break;
        }
    }).on('removed', function (evt, nipple) {
        nipple.off('dir');
    });
});

var startTime;
setInterval(function() {
    startTime = Date.now();
    socket.emit('ping');
}, 2000);

/* =============================================
   Boucle de jeu pour l'affichage dans le canvas
   =============================================  */

var timer;
timer = setInterval(function() {
    if (launch) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i <= canvas.width; i+= 50) {
            for (var j = 0; j <= canvas.height; j+= 50) {
                drawTrail({ 'x': 0,'y': j }, { 'x': canvas.width, 'y': j }, '#8FB6CB', 1);
                drawTrail({ 'x': i,'y': 0 }, { 'x':i, 'y': canvas.height }, '#8FB6CB', 1);
            }   
        }
        for (var k in players) {
            if(players.hasOwnProperty(k)) {
                drawPlayer(players[k]);
            }
        }
        context.font = '50px Roboto';
        context.fillStyle = '#6FC3DF';
        context.fillText(announce, canvas.width/2 - 20, canvas.height/2 + 15);
    }
}, 16);

function drawPlayer(player) {
    var temp;
    for (var k in player.trails) {
        if(player.hasOwnProperty('trails')) {
            if(player.trails[k] != player.trails[0]) {
                drawTrail(player.trails[k], temp, player.color, 5);
            }
            temp = player.trails[k];
            if(player.trails[k] == player.trails[player.trails.length -1]) {
                drawTrail(player.trails[k], { 'id': 0, 'x': player.x, 'y': player.y }, player.color, 5);
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

function drawTrail(point1, point2, color, lineWidth) {
    context.beginPath();
    context.moveTo(point1.x, point1.y);
    context.lineTo(point2.x, point2.y);
    context.lineWidth = lineWidth;
    context.strokeStyle = color;
    context.stroke();
}