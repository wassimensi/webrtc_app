"use strict"

// RTCPeerConnection Options
// Turn server addresses
//work as a relay server
var peerConnectionConfig = {
  rtcpMuxPolicy:"require",
  bundlePolicy:"max-bundle",
  iceServers:[
    {urls: ["turn:74.125.140.127:19305?transport=udp",
       "turn:[2A00:1450:400C:C08::7F]:19305?transport=udp",
       "turn:74.125.140.127:443?transport=tcp",
       "turn:[2A00:1450:400C:C08::7F]:443?transport=tcp"
       ],
     username:"CMiugcYFEgb+emCHfvAYzc/s6OMTIICjBQ",
     credential:"k633U3YTyv51XK27bTS1I8SmvjY="
    },
    {urls:["stun:stun.l.google.com:19302"]}

  ]};


var  signallingServer;
var localPeerConnection = null;
var localStream, localIsCaller, remoteStream, audio, dataChannel, receiveChannel;

// get all DOM components
var btnSend = document.getElementById('btn-send');
var btnVideoStop = document.getElementById('btn-video-stop');
var btnVideoStart = document.getElementById('btn-video-start');
var btnVideoJoin = document.getElementById('btn-video-join');
var localVideo = document.getElementById('local-video');
var remoteVideo = document.getElementById('remote-video');
var connectionState = document.getElementById('connection-state');
var guestConnectionState = document.getElementById('guest-connection-state');
var textMsg = document.getElementById('text-message');
var sendButton = document.getElementById('send-message-button');
var messagesArea = document.getElementById('messages-area');
var inputRoomName = document.getElementById('room-name');



//start initializations before connection
initConnection();

function initConnection() {

    //initialization for all peers
    connectionState.innerHTML="Connected";
    btnVideoStart.disabled = true;
    btnVideoJoin.disabled = true;
    btnVideoStop.disabled = true;
    // start connection to the signaling server!
    //creat peer connection
    connect();
}

function connect() {

    // create peer connection
    localPeerConnection = new RTCPeerConnection(peerConnectionConfig);

    //get media stream
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(function(stream) {
      /* use the stream */
      // get and save local stream
      trace('Got stream, saving it now and starting RTC conn');

      // must add before calling setRemoteDescription() because then
      // it triggers 'addstream' event
      localPeerConnection.addStream(stream);
      localStream = stream;
      // create signalling server
      signallingServer = new SignallingServer();
      //create connection to socket
      signallingServer.connect();
      //create data channel to send and receive data
      openDataChannel();
        //remote data channel triggred
      localPeerConnection.ondatachannel = function(event) {

      if (event.channel) {
          trace('receive remote channel');
          receiveChannel = event.channel;
          //receive message from peer
          receiveChannel.onmessage = function (event) {
          trace("Got message:", event.data);
          messagesArea.innerHTML += "him:"+event.data+ "<br />";
          };
          receiveChannel.onopen = function() {
          trace('channel opened');
          }
          receiveChannel.onclose = function(event) {
          trace('channel close');
          }
      }

  }

        // get ice candidates and send them over
        // wont get called unless SDP has been exchanged
        localPeerConnection.onicecandidate = function(event) {

            if (event.candidate) {
                //!!! send ice candidate over via signalling channel
                trace("Sending candidate");

                signallingServer.sendICECandidate(event.candidate);
            }

        }

        // when received ICE candidate
        signallingServer.onReceiveICECandidate = function(candidate) {
            trace('Set remote ice candidate');
            try{
              localPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                // stuff when the candidate is successfully passed to the ICE agent
                trace("ice condidate passed to agent");
            }
            catch(e){
              console.log("Error: Failure during addIceCandidate()");
            }
        }
      // a remote peer has joined room
      signallingServer.onGuestJoined = function() {
          trace('guest joined!');
          guestConnectionState.innerHTML = "Guest connected";
          btnVideoStart.disabled = false;
        }
        // second peer alredy joined room
         signallingServer.secondPeerJoined = function() {
            trace('second peer connected!');
            guestConnectionState.innerHTML = "host connected";
            btnVideoStart.disabled = false;
          }
          //the other peer start call and wait for you to establish connection
          signallingServer.onReceiveEstablishRequest = function() {
             trace('establish request received ');
             //initiate sdp and ice condidates exchange
             establishRTCConnection();
           }
    }).catch(function(error) {
      /* handle the error */
      //could not get media
      console.error('Something went wrong!');
      console.error(error);
      alert(error);
    });
  }

btnVideoStart.onclick = function(e) {
    e.preventDefault();
    // is starting the call
    localIsCaller = true;

    if (window.URL) {
      // show local video
      localVideo.src = window.URL.createObjectURL(localStream);
    } else {

      localVideo.src = localStream;
    }
    // send establish connection request to the other peer
    signallingServer.establishConnection();
    // can start once have gotten local video
    //establish connection
    establishRTCConnection();
    btnVideoStart.disabled = true;
    btnVideoJoin.disabled = true;
    btnVideoStop.disabled = false;
}

function establishRTCConnection() {

  if(localIsCaller){
    // set local description and send to remote
    localPeerConnection.createOffer(function(sessionDescription) {
    trace('set local session desc with offer');
    // set local description
    localPeerConnection.setLocalDescription(sessionDescription);

    // send local sdp to remote
    signallingServer.sendSDP(sessionDescription);
  },handleCreateOfferError);
}

    signallingServer.onCallRceived = function() {
     trace('call received and it rings!');
     //initiate sdp and ice condidates exchange
     btnVideoStart.disabled = true;
     btnVideoJoin.disabled = false;
    // establishRTCConnection();
     try {
       audio = new Audio('ring.wav');
       audio.play();
     } catch (e) {
       trace(e);
     }

   }

    // got sdp from remote
    signallingServer.onReceiveSdp = function(sdp) {
        // if local was the caller, set remote desc
        if (localIsCaller) {
            trace('is caller');
            trace('set remote session desc with answer');
            localPeerConnection.setRemoteDescription(new RTCSessionDescription(
                sdp));
        }
        // if local is joining a call, set remote sdp and create answer
        else {
            trace('set remote session desc with offer');
            localPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

                trace('make answer')
                localPeerConnection.createAnswer(function(sessionDescription) {
                    // set local description
                    trace('set local session desc with answer');
                    localPeerConnection.setLocalDescription(sessionDescription);

                    // send local sdp to remote too
                    signallingServer.sendSDP(sessionDescription);

            },onCreateSessionDescriptionError);
        }
      }



    // show remote stream
    signallingServer.onCallAccepted = function(){
      //remoteVideo.src = window.URL.createObjectURL(remoteStream);
      if (window.URL) {
    remoteVideo.src = window.URL.createObjectURL(remoteStream);
  } else {
    remoteVideo.src = remoteStream;
  }
    }

    // save remote stream
    localPeerConnection.onaddstream = function(data) {
      remoteStream = data.stream;

    }

    // when room is full, alert user
    signallingServer.onRoomFull = function(room) {
        window.alert('Room "' + room +
            '"" is full! Please join or create another room');
    }

    //reflect the current status of ICE gathering
    localPeerConnection.onicegatheringstatechange = function(event){
      trace(localPeerConnection.iceGatheringState);
    }

    //check ice connection state
    localPeerConnection.oniceconnectionstatechange = function(event) {

            trace(localPeerConnection.iceConnectionState);
            try {
              //kill connection if te other peer disconnect
              if(localPeerConnection.iceConnectionState === 'disconnected'){
                if (localPeerConnection != null) {
                    localPeerConnection.removeStream(localStream);
                    signallingServer.close();
                    localPeerConnection.close();
                    localVideo.src = "";
                    remoteVideo.src = "";
                }

                btnVideoStart.disabled = false;
                btnVideoJoin.disabled = false;
                btnVideoStop.disabled = true;
                localIsCaller = false;
                initConnection();
            }
            } catch (e) {
            }
            if(localPeerConnection.iceConnectionState === 'closed'){
              initConnection();
            }
            //if connection is established
            // make a call
          if(localPeerConnection.iceConnectionState === 'connected' && localIsCaller){
            signallingServer.call();

          }

    }
}

btnVideoJoin.onclick = function(e) {
    e.preventDefault();

    // just joining a call, not offering
    localIsCaller = false;
    if (window.URL) {
      // show local video
      localVideo.src = window.URL.createObjectURL(localStream);
      // show remote video
      remoteVideo.src = window.URL.createObjectURL(remoteStream);
} else {
  remoteVideo.src = remoteStream;
  localVideo.src = remoteStream;
}

    // join the call
    signallingServer.respond();
    audio.pause();
    btnVideoStart.disabled = true;
    btnVideoJoin.disabled = true;
    btnVideoStop.disabled = false;

}


btnVideoStop.onclick = function(e) {
    e.preventDefault();

    // kill all connections
    if (localPeerConnection != null ) {
        localPeerConnection.removeStream(localStream);
        localPeerConnection.close();
        signallingServer.close();
        localVideo.src = "";
        remoteVideo.src = "";
    }

    btnVideoStart.disabled = false;
    btnVideoJoin.disabled = false;
    btnVideoStop.disabled = true;
    localIsCaller = false;

}
//creating data channel
function openDataChannel() {
  trace("create data channel")
   var dataChannelOptions = {
      reliable:true
   };

   dataChannel = localPeerConnection.createDataChannel("myDataChannel", dataChannelOptions);
   // get data channel and send them over


   dataChannel.onerror = function (error) {
      trace("Error:", error);
   };


   dataChannel.onopen = function() {
  trace('channel opened');
}
dataChannel.onclose = function(event) {
trace('channel close');
}
}

//when a user clicks the send message button
sendButton.addEventListener("click", function (event) {
   trace("send message:"+textMsg.value);
   messagesArea.innerHTML += " you:"+textMsg.value + "<br />";
   var message = textMsg.value ;
   textMsg.value ="";
   dataChannel.send(message);
});

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}


function trace(text) {
    console.info(text);
}
