var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var nicknames = ["User1", "User2", "User3", "User4", "User5", "User6", "User7", "User8", "User9", "Bob"];
var online_users = [];
var color_list = {};
var chat_log = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){

	//initiate handshake with client
	socket.emit('handshake');

	socket.on('handshake response', function(username){
		//if client has cookie information, store their existing nickname, acknowledge the connection, and remove nickname from list of default names if exists
		if(username != "" && username != null){
			socket.nickname = username;
			socket.emit('connected', username);
			var index = nicknames.indexOf(username);
			if (index !== -1) nicknames.splice(index, 1);
		}

		//if client does not have cookie information, assign random default name, acknowledge the connection, remove nickname from list of default names, and assign default black nickname color
		else{
			var initial_name = nicknames[Math.floor(Math.random()*nicknames.length)];
			socket.nickname = initial_name;
			socket.emit('connected', initial_name);
			var index = nicknames.indexOf(initial_name);
			if (index !== -1) nicknames.splice(index, 1);
			color_list[socket.nickname] = "000000";
		}
	});

	//add nickname to the list of online users and notify all active clients to update their online user list
  socket.on('new user', function(nickname){
	online_users.push(nickname);
	io.emit('user list', online_users)
  });

  //calculate message timestamp and retrieve client nickname color, then notify all active clients of new message
  socket.on('chat message', function(msg){
	var time = new Date();
	var color = "#"+color_list[socket.nickname];
    io.emit('chat message', time, socket.nickname, msg, color);
  });

  //log client message
  socket.on('log message', function(msg){
	chat_log.push(msg);
  });

  //send chat log history to requesting client
  socket.on('display log', function(nickname){
	socket.emit('display log', chat_log);
  });

  //handle client's nickname request
  socket.on('name change', function(new_name){
	var conflict = false;
	var i = 0;

	//check if nickname is already taken
	while( i < online_users.length){

		//notify requesting client that nickname is already taken
		if(online_users[i] === new_name){
			conflict = true;
			socket.emit('name conflict', true);
			break;
		}
		i++;
	}
	//if no name conflict found, update nickname in online users list, apply previous color to the new nickname, and notify all active clients of the name change then update server side client nickname
	if(!conflict){
		var index = online_users.indexOf(socket.nickname);
		if (index !== -1) online_users[index] = new_name;
		color_list[new_name] = color_list[socket.nickname];
		delete color_list[socket.nickname];
		io.emit('name change', socket.nickname, new_name);
		socket.nickname = new_name;
	}
  });

  //update requesting client's nickname color
  socket.on('color change', function(color){
    color_list[socket.nickname] = color;
  });

  //on client disconnect, remove client from online users list and notify all active clients of the disconnection
  socket.on('disconnect', function(){
	var index = online_users.indexOf(socket.nickname);
	if (index !== -1) online_users.splice(index, 1);
	io.emit('disconnected', socket.nickname);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});