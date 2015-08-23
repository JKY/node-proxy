var proxy = require('./http-proxy.js');
var sys = require('sys');
var net = require('net');


/* sock writer */
var Writer = function(sock){
	this.output = function(id,data,end){
    	if(end === true){
    		if(data !== null){
    			sock.end(data);
    		}else{
    			sock.end();
    		}
    	}else{
    		if(sock != undefined &&
    				 sock != null && 
    				 	 sock.writable && 
    				 	 	  data !== null){
    			sock.write(data);
    		}
    	}
	}
};


var StandProxy = function(addr){
	this.sockn = 0;
	this.start = function(){
		var self = this;
		this.http_proxy = net.createServer(function(sock){
			var client1 = new proxy.HTTPProxy(0,false,new Writer(sock).output);
			sock.on('data',function(buff){
				client12.write(buff);
			});
		});
		this.https_proxy = net.createServer(function(sock){
			var client2 = new proxy.HTTPProxy(0,true,new Writer(sock).output);
			sock.on('data',function(buff){
				client2.write(buff);
			});
		});
		this.http_proxy.on('listening',function(){ 
			sys.debug("http proxy listening on port:" + self.http_proxy.address().port);
		});
		this.https_proxy.on('listening',function(){ 
			sys.debug("https proxy listening on port:" + self.https_proxy.address().port);
		});
		this.http_proxy.listen(8080,addr);
		this.https_proxy.listen(8081,addr);
	};

	this.stop = function(){
		if(this.http_proxy !== undefined){
			this.http_proxy.close();
			this.http_proxy = undefined;
		}
	}
};

new StandProxy('127.0.0.1').start();