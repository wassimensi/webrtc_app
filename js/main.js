"use strict"

// RTCPeerConnection Options
var peerConnectionConfig = {
  "rtcpMuxPolicy":"require",
  "bundlePolicy":"max-bundle",
  iceServers:[
    {urls: ["turn:74.125.140.127:19305?transport=udp",
       "turn:[2A00:1450:400C:C08::7F]:19305?transport=udp",
       "turn:74.125.140.127:443?transport=tcp",
       "turn:[2A00:1450:400C:C08::7F]:443?transport=tcp"
       ],
     username:"CLXiy8UFEgZuvxNbbx4Yzc/s6OMTIICjBQ",
     credential:"YJvUavnf0RcYmz5Fimy7orVOMio="
    },
    {urls:["stun:stun.l.google.com:19302"]}
  ]};


var localPeerConnection, signallingServer;

var btnSend = document.getElementById('btn-send');
var btnVideoStop = document.getElementById('btn-video-stop');
var btnVideoStart = document.getElementById('btn-video-start');
var btnVideoJoin = document.getElementById('btn-video-join');
var localVideo = document.getElementById('local-video');
var remoteVideo = document.getElementById('remote-video');

var inputRoomName = document.getElementById('room-name');

var localStream, localIsCaller;

btnVideoStop.onclick = function(e) {
    e.preventDefault();

    // kill all connections
    if (localPeerConnection != null) {
        localPeerConnection.removeStream(localStream);
        localPeerConnection.close();
        signallingServer.close();
        localVideo.src = "";
        remoteVideo.src = "";
    }

    btnVideoStart.disabled = false;
    btnVideoJoin.disabled = false;
    btnVideoStop.disabled = true;
}


btnVideoStart.onclick = function(e) {
    e.preventDefault();
    // is starting the call
    localIsCaller = true;
    initConnection();
}

btnVideoJoin.onclick = function(e) {
    e.preventDefault();
    // just joining a call, not offering
    localIsCaller = false;
    initConnection();
}

function initConnection() {

    var room = inputRoomName.value;
    //verify room name
    if (room == undefined || room.length <= 0) {
        alert('Please enter room name');
        return;
    }

    // start connection!
    connect(room);

    btnVideoStart.disabled = true;
    btnVideoJoin.disabled = true;
    btnVideoStop.disabled = false;
}


// WEBRTC STUFF STARTS HERE
// Set objects as most are currently prefixed
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection || window.msRTCPeerConnection;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription ||
    window.webkitRTCSessionDescription || window.msRTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia ||
    navigator.webkitGetUserMedia || navigator.msGetUserMedia;
window.SignallingServer = window.SignallingServer;

var sdpConstraints = {
    optional: [],
    mandatory: {
        OfferToReceiveVideo: true,
    }
}

function connect(room) {
    // create peer connection
    localPeerConnection = new RTCPeerConnection(peerConnectionConfig);

    // create local stream
    navigator.getUserMedia({
        video: true,
        audio: true
    }, function(stream) {
        // get and save local stream
        trace('Got stream, saving it now and starting RTC conn');

        // must add before calling setRemoteDescription() because then
        // it triggers 'addstream' event
        localPeerConnection.addStream(stream);
        localStream = stream;

        // show local video
        localVideo.src = window.URL.createObjectURL(stream);

        // can start once have gotten local video
        establishRTCConnection(room);

    }, errorHandler);
}

function establishRTCConnection(room) {
    // create signalling server
    signallingServer = new SignallingServer(room);
    signallingServer.connect();

    // get ice candidates and send them over
    // wont get called unless SDP has been exchanged
    localPeerConnection.onicecandidate = function(event) {
        if (event.candidate) {
            //!!! send ice candidate over via signalling channel
            trace("Sending candidate");

            signallingServer.sendICECandidate(event.candidate);
        }
    }

    // a remote peer has joined room, initiate sdp exchange
    signallingServer.onGuestJoined = function() {
        trace('guest joined!');

        // set local description and send to remote
        localPeerConnection.createOffer(function(sessionDescription) {
        trace('set local session desc with offer');
        // set local description
        localPeerConnection.setLocalDescription(sessionDescription);

        // send local sdp to remote
        signallingServer.sendSDP(sessionDescription);
      },handleCreateOfferError);
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

    // when received ICE candidate
    signallingServer.onReceiveICECandidate = function(candidate) {
        trace('Set remote ice candidate');
        localPeerConnection.addIceCandidate(new RTCIceCandidate(candidate)).then(_=>{
          // stuff when the candidate is successfully passed to the ICE agent
          trace("ice condidate passed to agent")
        }).catch(e=>{
          console.log("Error: Failure during addIceCandidate()");
        });

    }
    signallingServer.onReceiveKillRequest = function() {
        trace('kill connection received');
        if (localPeerConnection != null) {
            localPeerConnection.removeStream(localStream);
            localPeerConnection.close();
            signallingServer.close();
            localVideo.src = "";
            remoteVideo.src = "";
        }

        btnVideoStart.disabled = false;
        btnVideoJoin.disabled = false;
        btnVideoStop.disabled = true;

    }

    // when stream is added to connection, put it in video src
    localPeerConnection.onaddstream = function(data) {
        remoteVideo.src = window.URL.createObjectURL(data.stream);
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
            //kill connection if te other peer disconnect
            if(localPeerConnection.iceConnectionState === 'disconnected'){
              if (localPeerConnection != null) {
                  localPeerConnection.removeStream(localStream);
                  localPeerConnection.close();
                  signallingServer.close();
                  localVideo.src = "";
                  remoteVideo.src = "";
              }

              btnVideoStart.disabled = false;
              btnVideoJoin.disabled = false;
              btnVideoStop.disabled = true;
            }
    }

}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}


function errorHandler(error) {
    console.error('Something went wrong!');
    console.error(error);
}

function trace(text) {
    console.info(text);
}
