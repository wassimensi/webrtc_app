//configuring node express server
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const url = require('url');
var path = require('path');
//set port

var port = process.env.PORT || 8080
app.use(express.static(__dirname));

server.listen(port, function(){
console.log("app running on port 8080");
});
//app.use(express.static(__dirname));

// routes
app.get('/login', function(req, res){
  res.sendFile( __dirname + '/login_page.html');
});


//client table
var numClients = {};
var clients=[];


io.sockets.on('connection', function (socket){

  // convenience function to log server messages on the client
	function log(){
		var array = [">>> Message from server: "];
	  	array.push.apply(array,arguments);
	    socket.emit('log', array);
	}

  socket.on('create or join', function (room) {

    log('Received request to create or join room ' + room);
    if (numClients[room] === undefined) {
         numClients[room] = 1;
     } else {
         numClients[room]++;
     }
    log('Room ' + room + ' now has ' + numClients[room] + ' client(s)');

    if (numClients[room] == 1) {
      socket.join(room);
      clients.push(socket);
      socket.room = room;
      log('Client ID ' + socket.id + ' created room ' + room);
      io.to(room).emit('empty', room);

    } else if (numClients[room] === 2) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      socket.join(room);
      socket.room = room;
      clients.push(socket);
      socket.emit('join', room);
			socket.to(room).emit('joined', room, socket.id);

    } else { // max two clients
      socket.emit('full', room);
    }
  });
  // when receive CALL, broadcast call to other user
  socket.on('call', function(room){
    log('Received SDP from ' + room);
    socket.to(room).emit('call received', room);
  });
  // we are here!!!!!!!!!!
  socket.on('establish connection', function(room){
    log('establish connection request');
    socket.to(room).emit('establish request received', room);
  });
  socket.on('respond', function(room){
    log('Received response from ' + room);
    socket.to(room).emit('call accepted', room);
  });
	// when receive sdp, broadcast sdp to other user
	socket.on('sdp', function(data){
		log('Received SDP from ' + socket.id + data.sdp);
		socket.to(data.room).emit('sdp received', data.sdp);
	});
  // when receive channel, broadcast channel to other user
	socket.on('channel', function(data){
		log('Received channel from ' + socket.id + data.channel);
		socket.to(data.room).emit('channel received', data.channel);
	});

	// when receive ice candidate, broadcast sdp to other user
	socket.on('ice candidate', function(data){
		log('Received ICE candidate from ' + socket.id + ' ' + data.candidate);
		socket.to(data.room).emit('ice candidate received', data.candidate);
	});
  socket.on('Disconnecting', function(room){
    numClients[room]--;
    log("client disconnects and nbr of client is"+ numClients[room]);
    
  });
	socket.on('message', function (message) {
		log('Got message:', message);
    // for a real app, would be room only (not broadcast)
		socket.broadcast.emit('message', message);
	});


	socket.on('error', function(error){
		console.error(error);
	})

});
