//configuring node express server
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
//const url = require('url');
//var path = require('path');
var Mongo = require("mongodb").MongoClient;
var assert = require("assert");
var router = express.Router();


var bodyParser = require('body-parser');
var engine = require('consolidate');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
app.use(express.static(__dirname));
app.set('views', __dirname + '/views');
//app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded


var dburl = 'mongodb://wassimdbu:wassim@ds137110.mlab.com:37110/syrphonedb';

//set port
var port = process.env.PORT || 8080;


server.listen(port, function(error){
  assert.equal(null,error);
console.log("app running on port 8080");
});


// routes
app.get('/', function(req, res){
  //res.render("index.html");
  res.render('index.html');
});
app.get('/login', function(req, res){
  res.render("lgindex.hbs");
});
app.get('/signup', function(req, res){
  res.render("suindex.hbs");
});



app.post('/login', function(req, res){
  var resultArray = [];
  Mongo.connect(dburl, function(error, db) {
      assert.equal(null,error);
      db.collection("clients").find({"email": req.body.identifier}).toArray(function( err,item){
        assert.equal(null, err);
        if(item.length != 0){
          if(item[0].pwd === req.body.pwd)
          {
            res.redirect("/views/appindex.html");

          }else{
            console.log("pwd wrong");
            res.render('lgindex.hbs',{status : 'wrong password' });
          }

        }else{
          res.render('lgindex.hbs',{status : 'wrong email' });
          console.log("ca n'existe pas");
        }

      }, function(){
        db.close();
      });
});
});
app.post('/insert', function(req, res){

      if(req.body.pwd===req.body.confirmpwd ){

        // mongo data base
        Mongo.connect(dburl, function(error, db) {
            assert.equal(null,error);
            db.collection("clients").find({"email": req.body.email}).count().then(function( numItems) {

              if(numItems ===0){
                db.collection("clients").find({"username": req.body.username}).count().then(function( numItems) {

                  if(numItems ===0){
                    var client = {
                      lastname: req.body.lastname,
                      firstName: req.body.firstname,
                      username: req.body.username ,
                      email: req.body.email,
                      pwd: req.body.pwd
                    }
                    db.collection("clients").insertOne(client, null, function (error, results) {
                    assert.equal(null,error);
                    console.log("item inserted");
                    res.redirect('/');
                  });
                  }else{
                    console.log("Existing username");
                    res.render('suindex.hbs',{status : 'Existing username' });
                  }
                });

            }else{
                console.log("Existing mail");
                res.render('suindex.hbs',{status : 'Existing email' });
              }

              });
            });
        }else{
          console.log("passwords do not match");
          res.render('suindex.hbs',{status : 'passwords do not match' });
        }

    },function(){
      console.log('db closed');
      db.close;
    });





      //db.collection("clients").remove({'name': 'GLaDOS'});
        //  console.log("Connecté à la base de données 'webrtc-db'");
      //console.log("Le document a bien été inséré");
      //db.collection("clients").find().toArray(function (error, results) {
          //if (error) throw error;
          //console.log(results);
          //results.forEach(function( obj) {
              //console.log(

                //  "Nom : " + obj.name + "\n"   +
                //  "Jeu : " + obj.game
            //  );
          //});
      //});



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

    log(' join room ' + room);

      socket.join(room);
      clients.push(socket);
      socket.room = room;
      log('Client ID ' + socket.id + ' joined room ' + room);
      socket.emit('join', room);
			socket.to(room).emit('joined', room, socket.id);

    });
  // when receive CALL, broadcast call to other user
  socket.on('call', function(room){
    log('Received SDP from ' + room);
    socket.to(room).emit('call received', room);
  });

  socket.on('connection notification', function(room){
    log('Received connection state from ' + room);
    socket.to(room).emit('connection state received', room);
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
