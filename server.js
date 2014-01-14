var net = require('net');
var chunk = require('./chunk.js');
var sys = require('sys');
var colors = require( "colors");
var config = require( "./config.js");

var _stubs = {};
var _clients = {};

function count_dict(dict){
	return Object.keys(dict).length;
}

function random(dict){
	var tmp = Object.keys(dict);
	var max = tmp.length;
	var key = tmp[Math.floor(Math.random() * max)];
	return {"key":key,"sock":dict[key]};
}

var stuber = function(id,sock,write_func){
	var self = this;
	this.id = id;
	this.sock = sock;
	this.write_func = write_func;
	_stubs[this.id] = self;
	this.sock.setNoDelay(true);
	this.sock.on('data',function(buff){
						if(self.write_func != undefined){
							self.write_func(buff);
						}
					});

	this.sock.on('close',function(buff){
		self.__destroy();
	});

	this.sock.on('error',function(e){
		sys.log(("up stream:" + e).red);
		self.__destroy();
	});

	this.write = function(buff){
		if(self.sock != undefined){
			if(self.sock != undefined && 
						self.sock.writable){
				self.sock.write(buff);
			}
		};
	};

	this.end = function(buff){
		if(buff != undefined){
			self.sock.end(buff);
		}else{
			self.sock.end();
		}
		delete _stubs[this.id];
	};

	this.__destroy = function(){
		self.sock.destroy();
		delete _stubs[this.id];
	}
}



///// run
var up = net.createServer(function(sock){
							  var chunkid = sock.remotePort;
							  //sys.log(("new chunk:" + chunkid + ",total:" + count_dict(_stubs)).green);
							  var stub = new stuber(chunkid,sock,function(data){
							  		var cli = random(_clients);
							  		var tmp = new Buffer(data);
							  		var buff = new chunk.Encoder().encode(chunkid, 0, tmp);
							  		if(cli['sock'] != undefined && cli['sock'].writable){
							  			cli['sock'].write(buff);
							  		}else{
							  			// remove the died clients
							  			delete _clients[cli['key']];
							  		}
							  });
						 });

up.listen(config['proxy_port'],config['proxy_addr']);
up.on('listening',function(){  
	sys.log(("http proxy listening on: " + config['proxy_addr'] + ":" + config['proxy_port']).green); 
});

var down = net.createServer(function(sock){
								_clients[sock.remotePort] = sock;
								var decoder = new chunk.Decoder(function(chunkid,type,data){
									if(_stubs[chunkid] != undefined){
										if(type == 0){
											_stubs[chunkid].write(data);
										}else{
											_stubs[chunkid].end(data);
										}
									}
								});

								sock.on('data',function(data){
									var tmp = new Buffer(data);
									decoder.decode(tmp);
								});

								sock.on('error',function(e){
									sys.log(("client" + e).red);
								});

								sock.on('close',function(){
									sys.log("client sock closed".red);
									delete _clients[sock.localPort];
								})
							});
down.listen(config['tr_port'],config['proxy_addr']);
down.on('listening',function(){ 
	 sys.log(("tranport stream listening on: " + config['proxy_addr'] + ":" + config['tr_port']).green);
});