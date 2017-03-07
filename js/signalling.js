function trace(text){
    console.info(text);
}


// has methods to exchange SDP and ICE candidates and data channels
//name of the room
var room = "syhone";

var SignallingServer = function(){
    this.room = room;
    //creat socket connection
    this.socket = io.connect();

    this.socket.on('empty', function (room){
      this.isInitiator = true;
      trace('Room ' + room + ' has one client');
    });

    this.socket.on('full', function (room){
      trace('Room ' + room + ' is full');
      this.onRoomFull(room);
    }.bind(this));

    this.socket.on('call received', function (room){
      trace('received call from the other peer of ' + room);
      //establish connection and wait response
      this.onCallRceived();
    }.bind(this));

    this.socket.on('call accepted', function (room){
      trace(' call confirmed from the other peer of ' + room);
      this.onCallAccepted();
    }.bind(this));

    this.socket.on('joined', function (room, socketID){
      trace('New user has joined ' + room);
      //ask host to initiate sdp transfer
      this.onGuestJoined();
    }.bind(this));

    this.socket.on('join', function (data){
      trace('you join' + data);
      trace('Room has ' + data + ' clients');
      //inform local peer that the second peer is already connected
      this.secondPeerJoined();
    }.bind(this));

    this.socket.on('sdp received', function(sdp){
        trace('Received SDP ');
        trace(sdp);
        this.onReceiveSdp(sdp);
    }.bind(this));

    this.socket.on('establish request received', function(sdp){
        trace('Received establish request');
        this.onReceiveEstablishRequest();
    }.bind(this));

    this.socket.on('ice candidate received', function(candidate){
        trace('Received ICE candidate ');
        trace(candidate);
        this.onReceiveICECandidate(candidate);
    }.bind(this));

    this.socket.on('log', function (array){
      console.log.apply(console, array);
    });
}

SignallingServer.prototype = {
    connect: function(){
        if (this.room !== '') {
          trace('Joining room ' + this.room);
          this.socket.emit('create or join', this.room);
        }
    },
    sendChannel: function(channel){
          //send call to the callee
          this.socket.emit('channel', {
              room: this.room,
              channel: channel
          });
    },
    call: function(){
          //send call to the callee
          this.socket.emit('call', this.room);
    },

    respond: function(){
      //send response to the caller
        this.socket.emit('respond', this.room);
    },

    close: function(){
        trace('Disconnecting')
        this.socket.emit('Disconnecting', this.room);
        this.socket.disconnect();
    },
    establishConnection: function(){
        trace('establish remote connection')
        this.socket.emit('establish connection',this.room);
    },
    sendSDP: function(sdp){
        trace('sending sdp')
        trace(sdp);
        this.socket.emit('sdp', {
            room: this.room,
            sdp: sdp
        });
    },
    sendICECandidate: function(candidate){
        trace('sending ice candidate');
        this.socket.emit('ice candidate', {
            room: this.room,
            candidate: candidate
        });
    },
    onReceiveSdp: function(sdp){
        trace('Placeholder function: Received SDP')
    },
    
    secondPeerJoined: function(){
        trace('Placeholder function: there are two peer');
    },
    onGuestJoined: function(){
        trace('Placeholder function: Guest joined room');
    },
    onReceiveICECandidate: function(candidate){
        trace('Placeholder function: Received ICE candidate');
    },
    onReceiveEstablishRequest: function(){
        trace('Placeholder function: Received establish request');
    },
    onCallAccepted: function(){
        trace('Placeholder function: guest join call');

    },
    onCallRceived: function(){
        trace('Placeholder function: call received to the guest');
    },
    onRoomFull: function(room){
        trace('Placeholder function: Room is full!');
    }

}

window.SignallingServer = SignallingServer;
