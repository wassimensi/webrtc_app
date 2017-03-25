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
     username:"CM7p28YFEgZH/h46f4AYzc/s6OMTIICjBQ",
     credential:"fljWD1mi5rZ9Q/rQpCCSkdHE9Wk="
    },
    {urls:["stun:stun.l.google.com:19302"]}

  ]};
  // has methods to exchange SDP and ICE candidates and data channels
  //name of the room
var room = "syhone";
var clients;
var  signallingServer;
var localPeerConnection = null;
var localStream, remoteStream, audio, dataChannel, receiveChannel;
var localIsCaller = false;
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


// WEBRTC STUFF STARTS HERE
// Set objects as most are currently prefixed
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection || window.msRTCPeerConnection;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription ||
    window.webkitRTCSessionDescription || window.msRTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia ||
    navigator.webkitGetUserMedia || navigator.msGetUserMedia;
window.SignallingServer = window.SignallingServer

//start initializations before connection
initConnection();

function initConnection() {

    //initialization for all peers
    btnVideoStart.disabled = true;
    btnVideoJoin.disabled = true;
    btnVideoStop.disabled = true;

    connect();

}
function connect(){
  // create peer connection
  localPeerConnection = new RTCPeerConnection(peerConnectionConfig);
  // create signalling server
  signallingServer = new SignallingServer(room);
  //create connection to socket
  signallingServer.connect();


    // a remote peer has joined room
    signallingServer.onGuestJoined = function() {
        trace('guest joined!');
        guestConnectionState.innerHTML = "your friend is connected";
        btnVideoStart.disabled = false;
        signallingServer.iAmConnected();
      }
      // second peer alredy joined room
       signallingServer.youJoin = function() {
          trace('you are connected!');
          connectionState.innerHTML = "you are connected";
          btnVideoStart.disabled = false;
        }
        signallingServer.onConnectionReceived = function() {
           trace('the other peer is connected!');
           guestConnectionState.innerHTML = "your friend is connected";
           clients ++;
           if(clients>1){
             alert("there is more than 2 client in the room")
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
               trace('set remote session desc with offer');
               localPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

             }
           }
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







             // save remote stream
             localPeerConnection.onaddstream = function(data) {
               remoteStream = data.stream;



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
                       if(localPeerConnection.iceConnectionState === 'disconnected' || localPeerConnection.iceConnectionState === 'failed'){
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

                     if(localPeerConnection.iceConnectionState == 'failed'){
                       initConnection();
                     }
                     if(localPeerConnection.iceConnectionState === 'closed'){
                       initConnection();
                     }
                     //if connection is established
                     // make a call
                   if(localPeerConnection.iceConnectionState === 'connected' || 'completed'){

                     if (window.URL) {
                       // show local video
                       remoteVideo.src = window.URL.createObjectURL(remoteStream);
                     } else {

                         remoteVideo.src = localStream;
                     }
                   }

             }

         }



btnVideoStart.onclick = function(e) {

    e.preventDefault();
    // is starting the call
    localIsCaller = true;
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
      if (window.URL) {
        // show local video
        localVideo.src = window.URL.createObjectURL(localStream);
      } else {

        localVideo.src = localStream;
      }
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

    btnVideoStart.disabled = true;
    btnVideoJoin.disabled = true;
    btnVideoStop.disabled = false;

  }).catch(function(error) {
    /* handle the error */
    //could not get media
    console.error('Something went wrong!');
    console.error(error);
    alert(error);
  });
}


btnVideoJoin.onclick = function(e) {
    e.preventDefault();

    // just joining a call, not offering
    localIsCaller = false;
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
      if (window.URL) {
        // show local video
        localVideo.src = window.URL.createObjectURL(localStream);
      } else {

        localVideo.src = localStream;
      }



          trace('make answer')
          localPeerConnection.createAnswer(function(sessionDescription) {
              // set local description
              trace('set local session desc with answer');
              localPeerConnection.setLocalDescription(sessionDescription);

              // send local sdp to remote too
              signallingServer.sendSDP(sessionDescription);

      },onCreateSessionDescriptionError);

      audio.pause();
      btnVideoStart.disabled = true;
      btnVideoJoin.disabled = true;
      btnVideoStop.disabled = false;


  }).catch(function(error) {
    /* handle the error */
    //could not get media
    console.error('Something went wrong!');
    console.error(error);
    alert(error);
  });

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
