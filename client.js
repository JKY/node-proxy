var proxy = require('./http-proxy.js');
var net = require('net');
var chunk = require('./chunk.js');
var sys = require('sys');
var colors = require( "colors");



var master_addr = "127.0.0.1";
var master_port = 8000;

var ProxyClient = function(){
	var self = this;
	this.sock = new net.Socket();
	this.proxys = {};

	this.flush = function(chunkid,type,data){
		if( self.isConnected() &&  data !== null){
			var buff = new chunk.Encoder().encode(chunkid, type, new Buffer(data));
			self.sock.write(buff);
		}
	};

	this.decoder = new chunk.Decoder(function(chunkid,type,data){
		var _proxy;
		if(self.proxys[chunkid] == undefined){
			_proxy = self.proxys[chunkid] = new proxy.HTTPProxy(chunkid,function(_id,data,end){
																	    	if(end === true){
																	    		self.flush(_id,1,data);
																	    		delete self.proxys[_id];
																	    	}else{
																	    		self.flush(_id,0,data);
																	    	}
																		});

		}else{
			_proxy = self.proxys[chunkid];
		}
		_proxy.write(new Buffer(data));
	});

	this.isConnected = function(){
		return self.sock != undefined && self.sock != null && self.sock.writable;
	};


	this.start = function(){
		var self = this;
		this.sock.on('data',function(buff){
			self.decoder.decode(buff);
		});

		this.sock.on('error',function(e){
			sys.log(("client:" + e).red);
			if(self.sock != undefined){
				self.sock.destroy();
			}
			self.sock = undefined;
		});

		this.sock.on('close',function(){
			sys.log("client closed".yellow);
			if(self.sock != undefined){
				self.sock.destroy();
			}
		});

		this.sock.connect(master_port,master_addr,function(){
			sys.log(("proxy client connected to:" + master_addr + ":" + master_port).green);
		});
		return self;
	}
};
/* start */
var __proxy_client = new ProxyClient().start();
setInterval(function(){
	if(!__proxy_client.isConnected()){
		sys.log("reconnect proxy...".yellow);
		__proxy_client = new ProxyClient().start();
	}
},1000);