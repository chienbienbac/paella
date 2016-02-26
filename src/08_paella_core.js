Class ("paella.AccessControl", {
	permissions:{
		canRead:false,
		canContribute:false,
		canWrite:false,
		loadError:true,
		isAnonymous:false
	},

	userData:{
		username:'',
		name:'',
		lastname: '',
		avatar:'',
	},

	checkAccess:function(onSuccess) {
		onSuccess(this.permissions);
	},

	getAuthenticationUrl:function(callbackParam) { return ""; }
});

// Default Access Control
//
Class ("paella.DefaultAccessControl", paella.AccessControl,{
	_authParams:null,

	initialize:function(authParams) {
		this._authParams = authParams || {};
	},

	checkAccess:function(onSuccess) {
		var This = this;
		this.getUserData(function(data) {
			This.permissions = data.permissions;
			This.userData = data.userData;
			onSuccess(This.permissions);
		});
	},

	getUserData:function(onSuccess) {
		var status = false;
		if (paella.player.config.auth) {
			var callback = paella.player.config.auth.userDataCallbackName ? window[paella.player.config.auth.userDataCallbackName]:null;
			if (typeof(callback)=="function") {
				status = true;
				callback(onSuccess);
			}
		}
		if (!status) {
			onSuccess({
				permissions: {
					canRead: true,
					canContribute: false,
					canWrite: false,
					loadError: false,
					isAnonymous: true
				},
				userData: {
					username: 'anonymous',
					name: 'Anonymous',
					avatar: paella.utils.folders.resources() + '/images/default_avatar.png'
				}
			});
		}
	},

	getAuthenticationUrl:function(callbackParams) {
		var authCallback = this._authParams.authCallbackName && window[this._authParams.authCallbackName];
		if (!authCallback && paella.player.config.auth) {
			authCallback = paella.player.config.auth.authCallbackName && window[paella.player.config.auth.authCallbackName];
		}

		if (typeof(authCallback)=="function") {
			return authCallback(callbackParams);
		}
		return "";
	}
});


Class ("paella.VideoLoader", {
	metadata:{		// Video metadata
		title:"",
		duration:0
	},
	streams:[],		// {sources:{mp4:{src:"videourl.mp4",type:"video/mp4"},
					//			 ogg:{src:"videourl.ogv",type:"video/ogg"},
					//			 webm:{src:"videourl.webm",type:"video/webm"},
					//			 flv:{src:"videourl.flv",type:"video/x-flv"},
					//			 rtmp:{src:"rtmp://server.com/endpoint/url.loquesea",type="video/mp4 | video/x-flv"},
					//			 image:{frames:{frame_1:'frame_1.jpg',...frame_n:'frame_n.jpg'},duration:183},
					//	preview:'video_preview.jpg'}
	frameList:[],	// frameList[timeInstant] = { id:"frame_id", mimetype:"image/jpg", time:timeInstant, url:"image_url"}

	loadStatus:false,
	codecStatus:false,


	getMetadata:function() {
		return this.metadata;
	},

	loadVideo:function(videoId,onSuccess) {
		// This function must to:
		//	- load this.streams and this.frameList
		// 	- Check streams compatibility using this.isStreamCompatible(streamIndex)
		//	- Set this.loadStatus = true if load is Ok, or false if something gone wrong
		//	- Set this.codecStatus = true if the browser can reproduce all streams
		//	- Call onSuccess()
		onSuccess();
	}
});

Class ("paella.PlayerBase", {
	config:null,
	playerId:'',
	mainContainer:null,
	videoContainer:null,
	controls:null,
	accessControl:null,

	checkCompatibility:function() {
		var message = "";
		if (base.parameters.get('ignoreBrowserCheck')) {
			return true;
		}
		if (base.userAgent.browser.IsMobileVersion) return true;
		var isCompatible =	base.userAgent.browser.Chrome ||
							base.userAgent.browser.Safari ||
							base.userAgent.browser.Firefox ||
							base.userAgent.browser.Opera ||
							base.userAgent.browser.Edge ||
							(base.userAgent.browser.Explorer && base.userAgent.browser.Version.major>=9);
		if (isCompatible) {
			return true;
		}
		else {
			var errorMessage = base.dictionary.translate("It seems that your browser is not HTML 5 compatible");
			paella.events.trigger(paella.events.error,{error:errorMessage});
			message = errorMessage + '<div style="display:block;width:470px;height:140px;margin-left:auto;margin-right:auto;font-family:Verdana,sans-sherif;font-size:12px;"><a href="http://www.google.es/chrome" style="color:#004488;float:left;margin-right:20px;"><img src="'+paella.utils.folders.resources()+'images/chrome.png" style="width:80px;height:80px" alt="Google Chrome"></img><p>Google Chrome</p></a><a href="http://windows.microsoft.com/en-US/internet-explorer/products/ie/home" style="color:#004488;float:left;margin-right:20px;"><img src="'+paella.utils.folders.resources()+'images/explorer.png" style="width:80px;height:80px" alt="Internet Explorer 9"></img><p>Internet Explorer 9</p></a><a href="http://www.apple.com/safari/" style="float:left;margin-right:20px;color:#004488"><img src="'+paella.utils.folders.resources()+'images/safari.png" style="width:80px;height:80px" alt="Safari"></img><p>Safari 5</p></a><a href="http://www.mozilla.org/firefox/" style="float:left;color:#004488"><img src="'+paella.utils.folders.resources()+'images/firefox.png" style="width:80px;height:80px" alt="Firefox"></img><p>Firefox 12</p></a></div>';
			message += '<div style="margin-top:30px;"><a id="ignoreBrowserCheckLink" href="#" onclick="window.location = window.location + \'&ignoreBrowserCheck=true\'">' + base.dictionary.translate("Continue anyway") + '</a></div>';
			paella.messageBox.showError(message,{height:'40%'});
		}
		return false;
	},

	initialize:function(playerId) {
		if (base.parameters.get('log') != undefined) {
			var log = 0;
			switch(base.parameters.get('log')) {
				case "error":
					log = base.Log.kLevelError;
					break;					
				case "warn":
					log = base.Log.kLevelWarning;
					break;					
				case "debug":
					log = base.Log.kLevelDebug;
					break;					
				case "log":
				case "true":
					log = base.Log.kLevelLog;
					break;
			}
			base.log.setLevel(log);
		}		
			
		if (!this.checkCompatibility()) {
			base.log.debug('It seems that your browser is not HTML 5 compatible');
		}
		else {
			paella.player = this;
			this.playerId = playerId;
			this.mainContainer = $('#' + this.playerId)[0];
			this.accessControl = paella.initDelegate.initParams.accessControl;
			var thisClass = this;
			paella.events.bind(paella.events.loadComplete,function(event,params) { thisClass.loadComplete(event,params); });
		}
	},

	loadComplete:function(event,params) {

	},

	auth: {
		login: function(redirect) {
			redirect = redirect || window.location.href;
			var url = paella.initDelegate.initParams.accessControl.getAuthenticationUrl(redirect);
			if (url) {
				window.location.href = url;
			}
		},

		permissions:function() {
			return paella.initDelegate.initParams.accessControl.permissions;
		},

		userData:function() {
			return paella.initDelegate.initParams.accessControl.userData;
		}
	}
});

Class ("paella.InitDelegate", {
	initParams:{
		configUrl:'config/config.json',
		dictionaryUrl:'localization/paella',
		//editorDictionaryUrl:'config/editor_dictionary',
		accessControl:new paella.DefaultAccessControl(),
		videoLoader:new paella.VideoLoader()
	},

	initialize:function(params) {
		if (params) {
			for (var key in params) {
				this.initParams[key] = params[key];
			}
		}
	},

	getId:function() {
		return base.parameters.get('id') || "noid";
	},

	loadDictionary:function(onSuccess) {
		var asyncLoader = new base.AsyncLoader();
		asyncLoader.addCallback(new base.DictionaryCallback(this.initParams.dictionaryUrl));
		//asyncLoader.addCallback(new base.DictionaryCallback(this.initParams.editorDictionaryUrl));
		asyncLoader.load(function() {
				onSuccess();
			},
			function() {
				onSuccess();
			}
		);
	},

	loadConfig:function(onSuccess) {
		var configUrl = this.initParams.configUrl;
		var params = {};
		params.url = configUrl;
		base.ajax.get(params,function(data,type,returnCode) {
				if (typeof(data)=='string') {
					try {
						data = JSON.parse(data);
					}
					catch (e) {
						onSuccess({});
					}
				}
				base.dictionary.addDictionary(data);
				onSuccess(data);
			},
			function(data,type,returnCode) {
				paella.messageBox.showError(base.dictionary.translate("Error! Config file not found. Please configure paella!"));
				//onSuccess({});
			});
	},

	loadEditorConfig:function(onSuccess) {
		var data = {
			cssPath: paella.utils.folders.resources() + '/ui/jquery-ui.css'
		};
		onSuccess(data);
	}
});

var paellaPlayer = null;
paella.plugins = {};
paella.plugins.events = {};
paella.initDelegate = null;
