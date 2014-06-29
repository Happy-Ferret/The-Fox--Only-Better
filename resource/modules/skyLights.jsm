moduleAid.VERSION = '1.0.0';

this.__defineGetter__('skyLightsContainer', function() { return $(objName+'-skyLights-container'); });

this.skyLightsExisting = [];

// this is the part for interaction by other possible add-ons or elements that will add/control other sky lights
this.skyLights = {
	update: function(name, props) {
		if(typeof(name) != 'string') { return; }
		
		var light = this.get(name);
		
		if(!light) {
			// in case something calls this too soon
			if(!skyLightsContainer) { return; }
			
			light = document.createElement('box');
			light.id = objName+'-skyLights-'+name;
			setAttribute(light, 'class', 'skyLight');
			
			light._action = null;
			listenerAid.add(light, 'click', skyLightsOnClick);
			
			light.appendChild(document.createElement('box'));
			setAttribute(light.firstChild, 'class', 'skyLightArea');
			listenerAid.add(light.firstChild, 'click', skyLightsOnClick);
			
			skyLightsContainer.appendChild(light);
			skyLightsExisting.push({ name: name, node: light });
		}
		
		for(var p in props) {
			switch(p) {
				// state is an identifying string, mostly for convenience to quickly and easily retrieve the current state of the light
				case 'state':
					setAttribute(light, 'state', props[p]);
					break;
				
				// color is simply a color (rgb/a, hsl/a, hex string, color code) that will be applied to the light
				case 'color':
					light.style.backgroundColor = props[p];
					
					var isTransparent = props[p] == 'transparent';
					if(!isTransparent) {
						var colorExplode = props[p].split(',');
						if(colorExplode.length == 4) {
							isTransparent = parseInt(colorExplode[3]) == 0;
						}
					}
					
					styleAid.unload('skyLight-'+name+'_'+_UUID);
					
					var sscode = '/*The Fox, Only Better CSS declarations of variable values*/\n';
					sscode += '@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);\n';
					sscode += '@-moz-document url("'+document.baseURI+'") {\n';
					sscode += '	window['+objName+'_UUID="'+_UUID+'"] #theFoxOnlyBetter-skyLights-'+name+':-moz-any(:hover,[active],[alert="on"]) {\n';
					
					if(isTransparent) {
						sscode += '	box-shadow: rgba(0,0,0,0.2) 0 1px 2px;\n';
					} else {
						sscode += '	box-shadow: rgba(0,0,0,0.2) 0 1px 2px 1px, '+props[p]+' 3px 0 4px, '+props[p]+' -3px 0 4px, '+props[p]+' 0 0px 11px;\n';
					}
					
					sscode += '	}\n';
					sscode += '}';
					
					styleAid.load('skyLight-'+name+'_'+_UUID, sscode, true);
					toggleAttribute(light, 'transparent', isTransparent);
					
					break;
				
				// tooltip is the text that should appear when the mouse is hovered to the light
				case 'tooltip':
					setAttribute(light, 'tooltiptext', props[p]);
					break;
				
				// action is the method to be called when the user clicks the sky light
				case 'action':
					light._action = props[p];
					toggleAttribute(light, 'action', props[p]);
					break;
					
				// active will set an active attribute to the light, making it always "on" as if the mouse was over it
				case 'active':
					toggleAttribute(light, 'active', props[p]);
					break;
				
				// alert will blink the light until the user hovers it with the mouse
				case 'alert':
					if(light._alert) {
						light._alert();
					}
					
					if(props[p]) {
						light._alert = function() {
							timerAid.cancel('skyLightsAlert-'+name);
							listenerAid.remove(light, 'mouseover', light._alert);
							delete light._alert;
							removeAttribute(light, 'alert');
						};
						
						listenerAid.add(light, 'mouseover', light._alert);
						timerAid.init('skyLightsAlert-'+name, function() {
							setAttribute(light, 'alert', (light.getAttribute('alert') == 'on') ? 'off' : 'on');
						}, 500, 'slack');
					}
					break;
				
				default: break;
			}
		}
	},
	
	get: function(name) {
		if(typeof(name) != 'string') { return; }
		
		for(var s of skyLightsExisting) {
			if(s.name == name) {
				return s.node;
			}
		}
		return null;
	},
	
	remove: function(name) {
		if(typeof(name) != 'string') { return; }
		
		for(var i = 0; i < skyLightsExisting.length; i++) {
			if(skyLightsExisting[i].name == name) {
				listenerAid.remove(skyLightsExisting[i].node, 'click', skyLightsOnClick);
				listenerAid.remove(skyLightsExisting[i].node.firstChild, 'click', skyLightsOnClick);
				if(skyLightsExisting[i].node._alert) {
					skyLightsExisting[i].node._alert();
				}
				
				skyLightsExisting[i].node.remove();
				styleAid.unload('skyLight-'+name+'_'+_UUID);
				skyLightsExisting.splice(i, 1);
				break;
			}
		}
	}
};

this.skyLightsOnClick = function(e) {
	if(e.defaultPrevented) { return; }
	
	if(e.target._action) {
		e.target._action(e);
	} else if(e.target.parentNode._action) {
		e.target.parentNode._action(e);
	}
};

this.skyLightsOnSlimChrome = function(e) {
	var node = e.detail.target;
	if(!isAncestor(node, skyLightsContainer)) { return; }
	
	while(node) {
		if(node == skyLightsContainer) { return; }
		
		if(node.className == 'skyLight') {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		
		node = node.parentNode;
	}
};

this.skyLightsHideOnChrome = function() {
	toggleAttribute(skyLightsContainer, 'hideWhenChromeVisible', prefAid.skyLightsHide);
};

this.skyLightsLoad = function() {
	listenerAid.add(slimChromeContainer, 'WillShowSlimChrome', skyLightsOnSlimChrome, true);
	
	prefAid.listen('skyLightsHide', skyLightsHideOnChrome);
	skyLightsHideOnChrome();
	
	dispatch(skyLightsContainer, { type: 'LoadedSkyLights', cancelable: false });
};

this.skyLightsUnload = function() {
	dispatch(skyLightsContainer, { type: 'UnloadingSkyLights', cancelable: false });
	
	prefAid.unlisten('skyLightsHide', skyLightsHideOnChrome);
	removeAttribute(skyLightsContainer, 'hideWhenChromeVisible');
	
	listenerAid.remove(slimChromeContainer, 'WillShowSlimChrome', skyLightsOnSlimChrome, true);
	
	// make sure all the lights are properly unloaded
	while(skyLightsExisting.length > 0) {
		skyLights.remove(skyLightsExisting[0].name);
	}
};

moduleAid.LOADMODULE = function() {
	overlayAid.overlayURI('chrome://'+objPathString+'/content/slimChrome.xul', 'skyLights', null,
		function(aWindow) { if(typeof(aWindow[objName].skyLightsLoad) != 'undefined') { aWindow[objName].skyLightsLoad(); } },
		function(aWindow) { if(typeof(aWindow[objName].skyLightsUnload) != 'undefined') { aWindow[objName].skyLightsUnload(); } }
	);
};

moduleAid.UNLOADMODULE = function() {
	if(UNLOADED || !prefAid.skyLights || !prefAid.includeNavBar) {
		overlayAid.removeOverlayURI('chrome://'+objPathString+'/content/slimChrome.xul', 'skyLights');
	}
};