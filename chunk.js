/** 编码 **/
var Encoder = exports.Encoder = function(){
	this.encode = function(id, type, data){
		var buff = new Buffer(data.length + 10);
		buff.writeUInt8(0x03,0);
		buff.writeUInt8(type,1);
		buff.writeUInt32LE(id,2);
		buff.writeUInt32LE(data.length,6);
		data.copy(buff,10);	
		return buff;
	}
};

/** 解码 */
var Decoder =  exports.Decoder = function(callback){
	this._state = '_init';
	this._id = 0xffffff;
	this._type = 0;
	this._header_buff = new Buffer(9);
	this._header_offset = 0;
	this._buff = null;
	this._total = 0;
	this._callback = callback;

	this.decode = function(data){
		/*
		console.log("======" + this._state);
		for(var i=0;i<data.length;i++){
			console.log(data[i].toString(16));
		}
		*/
		next = this[this._state](data);
		if(next !== true){
			this._state = next['state'];
			var tmp = next['data'];
			if(tmp.length == 0){
				return true;
			}else{
				return this.decode(tmp);
			}
		}else{
			return true;
		}
	};

	this._init = function(data){
		for(var i =0; i<data.length; i++){
			if(data[i] == 0x03){
				return {
							"state":"_header",
							"data":data.slice(i+1,data.length)
					    }
			}
		}
		return true;
	};

	this._header = function(data){
		for(var i =0; i<data.length; i++){
			this._header_buff[this._header_offset++] = data[i];
			if(this._header_offset == 1){
				this._type = this._header_buff.readUInt8(0);
			}else if(this._header_offset == 5){
				this._id = this._header_buff.readUInt32LE(1);
			}else if(this._header_offset == 9){
				this._total = this._header_buff.readUInt32LE(5);
				return {
							"state":"_data",
							"data":data.slice(i+1,data.length)
					    }
			}
		}
		return true;
	};

	this._data = function(data){
		var len = data.length;
		var bufflen = 0;
		if(this._buff !== null){
			bufflen = this._buff.length;
		}
		if( bufflen + len <= this._total){
			if(this._buff === null){
				this._buff = new Buffer(data);
			}else{
				this._buff += data;
			}
			if(bufflen+len == this._total){
				return this._reset([]);
			}
		}else{
			var middle = this._total-bufflen;
			if(this._buff === null){
				this._buff = data.slice(0,middle);
			}else{
				this._buff += data.slice(0,middle);
			}
			return this._reset(data.slice(middle,data.length));
		}
		return true;
	};

	this._reset = function(data){
		if(this._callback != undefined){
			this._callback(this._id, this._type, this._buff);
		}
		this._state = '_init';
		this._buff = null;
		this._header_offset = 0;
		this._total = 0;
		return {
					"state":"_init",
					"data":data
			    }
	};
} 


function test_chunk(){
	var decoder = new Decoder(function(id,type,data){
		console.log("id:" + id + ",type:" + type +  ",chunk:" + data);
	});
	var data = new Encoder().encode(63085, 1, new Buffer("你好a"));
	var split = 5;
	decoder.decode(data.slice(0,split));
	decoder.decode(data.slice(split,data.length));
	decoder.decode(data);
}
