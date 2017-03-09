function trace(text){
    console.info(text);
}


var SignallingServer = function(room){
    this.room = room;
    //creat socket connection
    this.socket = io.connect();


    this.socket.on('call received', function (room){
      trace('received call from the other peer of ' + room);
      //establish connection and wait response
      this.onCallRceived();
    }.bind(this));

    this.socket.on('connection state received', function (room){
      trace(' connection notification from the other peer of ' + room);
      this.onConnectionReceived();
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
      this.youJoin();
    }.bind(this));

    this.socket.on('sdp received', function(sdp){
        trace('Received SDP ');
        trace(sdp);
        this.onReceiveSdp(sdp);
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
    iAmConnected: function(){
          //send call to the callee
          this.socket.emit('connection notification', this.room);
    },

    close: function(){
        trace('Disconnecting')
        this.socket.emit('Disconnecting', this.room);
        this.socket.disconnect();
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
    onConnectionReceived: function(){
        trace('Placeholder function: Received connection')
    },
    youJoin: function(){
        trace('Placeholder function: you join room');
    },
    onGuestJoined: function(){
        trace('Placeholder function: Guest joined room');
    },
    onReceiveICECandidate: function(candidate){
        trace('Placeholder function: Received ICE candidate');
    },

    onCallRceived: function(){
        trace('Placeholder function: call received to the guest');
    },

}

window.SignallingServer = SignallingServer;
