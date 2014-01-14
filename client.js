var proxy = require('./http-proxy.js');
var net = require('net');
var chunk = require('./chunk.js');
var sys = require('sys');
var colors = require( "colors");
var config = require( "./config.js");

var ProxyClient = function(){
	var self = this;
	this.sock = new net.Socket();
	this.sock.setNoDelay(true);
	this.proxys = {};
	this.flush = function(chunkid,type,data){
		if( self.isConnected() &&  data !== null){
			var packs = new chunk.Encoder().encode(chunkid, type, new Buffer(data));
			for(var i=0;i<packs.length;i++){
  				self.sock.write(packs[i]);
  			}
			//debug
			if(self.proxys[chunkid] != undefined){
				for(var i=0;i<packs.length;i++){
  					self.proxys[chunkid].tx += packs[i].length;
  				}
				self.proxys[chunkid].pl += data.length;
				//console.log("data:" + data.length + ",pack:" + buff.length);
				if(type != 0){
					//console.log("==================");
					//console.log("data:" + self.proxys[chunkid].pl + ",total:" + self.proxys[chunkid].tx);
				}
			}
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
	},false);

	this.isConnected = function(){
		return self.sock != undefined && self.sock != null;
	};


	this.start = function(addr,port){
		sys.log(("proxy client connecting to:" + addr + ":" + port).yellow);
		var self = this;
		this.sock.on('data',function(buff){
			self.decoder.decode(buff);
		});

		this.sock.on('error',function(e){
			sys.log(("client:" + e).red);
			if(self.sock != undefined){
				//self.sock.destroy();
			}
			//self.sock = undefined;
		});

		this.sock.on('close',function(){
			sys.log("client closed".yellow);
			if(self.sock != undefined){
				self.sock.destroy();
			}
		});

		this.sock.connect(port,addr,function(){
			sys.log(("proxy client connected to:" + addr + ":" + port).green);
		});
		return self;
	}
};

/* start */
var master_addr = config['proxy_addr'];
var master_port = config['tr_port'];
var __proxy_client = new ProxyClient().start(master_addr,master_port);
setInterval(function(){
	if(!__proxy_client.isConnected()){
		sys.log(("reconnect to proxy server:" + master_addr + ":" + master_port).yellow);
		__proxy_client = new ProxyClient().start(master_addr,master_port);
	}
},5000);