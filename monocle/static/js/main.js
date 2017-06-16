var _last_pokemon_id = 0;
var _pokemon_count = 251;
var _WorkerIconUrl = 'static/monocle-icons/assets/ball.png';
var _PokestopIconUrl = 'static/monocle-icons/assets/stop.png';

var _NotificationID = [0]; //This is the default list for notifications



var showIV = false;
var alwaysShow100 = false;
var hidden100 = [] // exclusion list for alwaysShow100

var ivRequired = 80; //iv text rule groups
var rareList = [0]; // rarelist needs minimun ivRequired% to be shown,
var ultraRareList = [0]; // iv text for ultrare always shown



var PokemonIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, -15]
    },
    createIcon: function() {
        var div = document.createElement('div');
        if(showIV){
        div.innerHTML =
            '<div class="pokemarker">' +
              '<div class="sprite">' +
                   '<span class="sprite-' + this.options.iconID + '" /></span>' +
              '</div>' +
              '<div class="remaining_text_iv '+ this.options.rare +'" id="iv'+this.options.ivrange +'">' + this.options.iv.toFixed(0) +'%</div>' +
              '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
            '</div>';
        }
        else{
        div.innerHTML =
            '<div class="pokemarker">' +
              '<div class="sprite">' +
                   '<span class="sprite-' + this.options.iconID + '" /></span>' +
              '</div>' +
              '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
            '</div>';
        return div;
    }
    }
});

var FortIcon = L.Icon.extend({
    options: {
        iconSize: [20, 20],
        popupAnchor: [0, -10],
        className: 'fort-icon'
    }
});
var WorkerIcon = L.Icon.extend({
    options: {
        iconSize: [20, 20],
        className: 'worker-icon',
        iconUrl: _WorkerIconUrl
    }
});

var PokestopIcon = L.Icon.extend({
    options: {
        iconSize: [10, 20],
        className: 'pokestop-icon',
        iconUrl: _PokestopIconUrl
    }
});


var markers = {};
var overlays = {
    Pokemon: L.markerClusterGroup({ disableClusteringAtZoom: 12,spiderLegPolylineOptions: { weight: 1.5, color: '#fff', opacity: 0.5 },zoomToBoundsOnClick: false }),
    Gyms: L.layerGroup([]),
    Pokestops: L.layerGroup([]),
    Workers: L.layerGroup([]),
    Spawns: L.layerGroup([]),
    ScanArea: L.layerGroup([])
};

function unsetHidden (event) {
    event.target.hidden = false;
}

function setHidden (event) {
    event.target.hidden = true;
}

function monitor (group, initial) {
    group.hidden = initial;
    group.on('add', unsetHidden);
    group.on('remove', setHidden);
}

monitor(overlays.Pokemon, false)
monitor(overlays.Gyms, true)
monitor(overlays.Workers, false)

function getPopupContent (item) {
    var diff = (item.expires_at - new Date().getTime() / 1000);
    var minutes = parseInt(diff / 60);
    var seconds = parseInt(diff - (minutes * 60));
    var expires_at = minutes + 'm ' + seconds + 's';
    var content = '<b>' + item.name + '</b> - <a href="https://pokemongo.gamepress.gg/pokemon/' + item.pokemon_id + '">#' + item.pokemon_id + '</a>';
    

	if(item.atk != undefined && showIV){
        var totaliv = 100 * (item.atk + item.def + item.sta) / 45;
        content += ' - <b>' + totaliv.toFixed(2) + '%</b></br>';
        content += 'Disappears in: ' + expires_at + '<br>';
        content += 'Move 1: ' + item.move1 + '</br>';
        content += 'Move 2: ' + item.move2 + '<br>';
    } else {
        content += '<br>Disappears in: ' + expires_at + '<br>';
    }
	content += '<a href="#" data-pokeid="'+item.pokemon_id+'" data-newlayer="trash" class="popup_filter_link">Hide</a>';
    content += '&nbsp; | &nbsp;';

    var userPref = getPreference('notif-'+item.pokemon_id);
    if (userPref == 'rare'){
        content += '<a href="#" data-pokeid="'+item.pokemon_id+'" data-newnotif="common" class="popup_notif_link">Unnotify</a>';
    }else{
        content += '<a href="#" data-pokeid="'+item.pokemon_id+'" data-newnotif="Rare" class="popup_notif_link">Notify</a>';
    }
    content += ' | <a href=https://maps.google.com/maps?q='+ item.lat + ','+ item.lon +' title="Maps">Maps</p></a>';
    return content;
}

function getOpacity (diff) {
    if (diff > 300 || getPreference('FIXED_OPACITY') === "1") {
        return 1;
    }
    return 0.5 + diff / 600;
}


function PokemonMarker (raw) {

    if(raw.atk != undefined && showIV){
        var ivrange = 0;
        var rare = "notrare";
        var totaliv = 100 * (raw.atk + raw.def + raw.sta) / 45;
        if (rarelist.includes(raw.pokemon_id) && totaliv > ivRequired || ultralist.includes(raw.pokemon_id)) rare = "israre";
        if (totaliv > 99) ivrange = 100;
        else if(totaliv > 90) ivrange = 90;
        else if(totaliv > 80) ivrange = 80;
        else if(totaliv > 70) ivrange = 70;
        else if(totaliv > 60) ivrange = 60;
        else if(totaliv > 50) ivrange = 50;
        else if(totaliv > 40) ivrange = 40;
        else if(totaliv > 30) ivrange = 30;
        else if(totaliv > 20) ivrange = 20;
        var icon = new PokemonIcon({iconUrl: '/static/monocle-icons/icons/' + raw.pokemon_id + '.png', ivrange: ivrange,rare: rare, iv: totaliv,expires_at: raw.expires_at});
	}
    else var icon = new PokemonIcon({iconID: raw.pokemon_id, expires_at: raw.expires_at});
    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1});

    var intId = parseInt(raw.id.split('-')[1]);
    if (_last_pokemon_id < intId){
        _last_pokemon_id = intId;
    }
    
    
    if(showIV && alwaysShow100){
        var ishidden100 = hidden100.includes(raw.pokemon_id);
        if (totaliv==100 && !ishidden100){
            marker.overlay = 'Pokemon';
        } 
    }
	
    if (raw.trash) {
        marker.overlay = 'Trash';
    } 
    else {
        marker.overlay = 'Pokemon';
    }
    var userPreference = getPreference('filter-'+raw.pokemon_id);
    if (showIV && alwaysShow100){
        if (totaliv==100 && !ishidden100){
            marker.overlay = 'Pokemon';
        }
        else if (userPreference === 'pokemon'){
            marker.overlay = 'Pokemon';
        }else if (userPreference === 'trash'){
            marker.overlay = 'Trash';
        }else if (userPreference === 'hidden'){
            marker.overlay = 'Hidden';
        }
        
	}else if (userPreference === 'pokemon'){
        marker.overlay = 'Pokemon';
    }else if (userPreference === 'trash'){
        marker.overlay = 'Trash';
    }else if (userPreference === 'hidden'){
        marker.overlay = 'Hidden';
    }
    
    var userPreferenceNotif = getPreference('notif-'+raw.pokemon_id);
	if(localStorage.distance){
		if(userPreferenceNotif === 'rare' && checkCoords(raw.lat,raw.lon)){
			spawnNotification(raw);
		}
	}
	else{
		if(userPreferenceNotif === 'rare'){
			spawnNotification(raw);
		}
    }
    
    marker.raw = raw;
    markers[raw.id] = marker;
    marker.on('popupopen',function popupopen (event) {
		event.popup.options.autoPan = true; 
        event.popup.setContent(getPopupContent(event.target.raw));
        event.target.popupInterval = setInterval(function () {
            event.popup.setContent(getPopupContent(event.target.raw));
			event.popup.options.autoPan = false; 
        }, 1000);
    });
    marker.on('popupclose', function (event) {
        clearInterval(event.target.popupInterval);
    });
    marker.setOpacity(getOpacity(marker.raw));
    marker.opacityInterval = setInterval(function () {
        if (marker.overlay === "Trash" ) {
            return;
        }
        var diff = marker.raw.expires_at - new Date().getTime() / 1000;
        if (diff > 0) {
            marker.setOpacity(getOpacity(diff));
        } else {
            overlays.Pokemon.removeLayer(marker);
            overlays.Pokemon.refreshClusters();
            markers[marker.raw.id] = undefined;
            clearInterval(marker.opacityInterval);
        }
    }, 2500);
    marker.bindPopup();
    return marker;
}

function FortMarker (raw) {
    var icon = new FortIcon({iconUrl: '/static/monocle-icons/forts/' + raw.team + '.png'});
    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1});
    marker.raw = raw;
    markers[raw.id] = marker;
    marker.on('popupopen',function popupopen (event) {
        var content = ''
        if (raw.team === 0) {
            content = '<b>An empty Gym!</b>'
        }
        else {
            if (raw.team === 1 ) {
                content = '<b>Team Mystic</b>'
            }
            else if (raw.team === 2 ) {
                content = '<b>Team Valor</b>'
            }
            else if (raw.team === 3 ) {
                content = '<b>Team Instinct</b>'
            }
            content += '<br>Prestige: ' + raw.prestige +
                       '<br>Guarding Pokemon: ' + raw.pokemon_name + ' (#' + raw.pokemon_id + ')';
        }
        content += '<br>=&gt; <a href=https://www.google.com/maps/?daddr='+ raw.lat + ','+ raw.lon +' target="_blank" title="See in Google Maps">Get directions</a>';
        event.popup.setContent(content);
    });
    marker.bindPopup();
    return marker;
}

function WorkerMarker (raw) {
    var icon = new WorkerIcon();
    var marker = L.marker([raw.lat, raw.lon], {icon: icon});
    var circle = L.circle([raw.lat, raw.lon], 70, {weight: 2});
    var group = L.featureGroup([marker, circle])
        .bindPopup('<b>Worker ' + raw.worker_no + '</b><br>time: ' + raw.time + '<br>speed: ' + raw.speed + '<br>total seen: ' + raw.total_seen + '<br>visits: ' + raw.visits + '<br>seen here: ' + raw.seen_here);
    return group;
}

function addPokemonToMap (data, map) {
    data.forEach(function (item) {
        // Already placed? No need to do anything, then
        if (item.id in markers) {
            return;
        }
        var marker = PokemonMarker(item);
        if (marker.overlay == "Pokemon")
        {
            overlays.Pokemon.addLayer(marker);
        }
    });
    updateTime();
    if (_updateTimeInterval === null){
        _updateTimeInterval = setInterval(updateTime, 1000);
    }
}


function addGymsToMap (data, map) {
    data.forEach(function (item) {
        // No change since last time? Then don't do anything
        var existing = markers[item.id];
        if (typeof existing !== 'undefined') {
            if (existing.raw.sighting_id === item.sighting_id) {
                return;
            }
            existing.removeFrom(overlays.Gyms);
            markers[item.id] = undefined;
        }
        marker = FortMarker(item);
        marker.addTo(overlays.Gyms);
    });
}

function addSpawnsToMap (data, map) {
    data.forEach(function (item) {
        var circle = L.circle([item.lat, item.lon], 5, {weight: 2});
        var time = '??';
        if (item.despawn_time != null) {
            time = '' + Math.floor(item.despawn_time/60) + 'min ' +
                   (item.despawn_time%60) + 'sec';
        }
        else {
            circle.setStyle({color: '#f03'})
        }
        circle.bindPopup('<b>Spawn ' + item.spawn_id + '</b>' +
                         '<br/>despawn: ' + time +
                         '<br/>duration: '+ (item.duration == null ? '30mn' : item.duration + 'mn') +
                         '<br>=&gt; <a href=https://www.google.com/maps/?daddr='+ item.lat + ','+ item.lon +' target="_blank" title="See in Google Maps">Get directions</a>');
        circle.addTo(overlays.Spawns);
    });
}

function addPokestopsToMap (data, map) {
    data.forEach(function (item) {
        var icon = new PokestopIcon();
        var marker = L.marker([item.lat, item.lon], {icon: icon});
        marker.raw = item;
        marker.bindPopup('<b>Pokestop: ' + item.external_id + '</b>' +
                         '<br>=&gt; <a href=https://www.google.com/maps/?daddr='+ item.lat + ','+ item.lon +' target="_blank" title="See in Google Maps">Get directions</a>');
        marker.addTo(overlays.Pokestops);
    });
}

function addScanAreaToMap (data, map) {
    data.forEach(function (item) {
        if (item.type === 'scanarea'){
            L.polyline(item.coords).addTo(overlays.ScanArea);
        } else if (item.type === 'scanblacklist'){
            L.polyline(item.coords, {'color':'red'}).addTo(overlays.ScanArea);
        }
    });
}

function addWorkersToMap (data, map) {
    overlays.Workers.clearLayers()
    data.forEach(function (item) {
        marker = WorkerMarker(item);
        marker.addTo(overlays.Workers);
    });
}

function getPokemon () {
    if (overlays.Pokemon.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get('/data?last_id='+_last_pokemon_id, function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addPokemonToMap(data, map);
    });
}

function getGyms () {
    if (overlays.Gyms.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get('/gym_data', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addGymsToMap(data, map);
    });
}

function getSpawnPoints() {
    new Promise(function (resolve, reject) {
        $.get('/spawnpoints', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addSpawnsToMap(data, map);
    });
}

function getPokestops() {
    new Promise(function (resolve, reject) {
        $.get('/pokestops', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addPokestopsToMap(data, map);
    });
}

function getScanAreaCoords() {
    new Promise(function (resolve, reject) {
        $.get('/scan_coords', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addScanAreaToMap(data, map);
    });
}

function getWorkers() {
    if (overlays.Workers.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get('/workers_data', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addWorkersToMap(data, map);
    });
}

//Coords-parsing format is url.com/?lat=1234.56&lon=9.87654&zoom=13
var params = {};
window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
  params[key] = value;
});

var parsezoom = 12.5;
if(parseFloat(params.zoom)) parsezoom = parseFloat(params.zoom);

if(parseFloat(params.lat) && parseFloat(params.lon)){
    var map = new L.Map('main-map', {
        center: [parseFloat(params.lat), parseFloat(params.lon)], 
        zoom: parsezoom,
		maxZoom: 18,
    });
}
else{
    var map = L.map('main-map', {preferCanvas: true, maxZoom: 18,}).setView(_MapCoords, 12.5);
}



overlays.Pokemon.addTo(map);
//overlays.Gyms.addTo(map);
//overlays.Spawns.addTo(map);
//overlays.Pokestops.addTo(map);
//overlays.ScanArea.addTo(map);
//overlays.Workers.addTo(map);
//uncomment the layers you want to be shown by default
//also uncomment the lines in map.whenready so that they are updated

//Safari checker since safari can only use 5mb of cache
//to support safari you need to request in chunks more data
if (L.Browser.safari) 
{
	var layer = L.tileLayer(_MapProviderUrl, {
    opacity: 0.80,
	useCache: false,
    attribution: _MapProviderAttribution
	});
}
//if your mapprovider does not support cors disable cache and crossOrigin
//the map will be grey on load if it doesnt support cors/caching
else
{
	var layer = L.tileLayer(_MapProviderUrl, {
		opacity: 0.80,
		useCache: true,		
		crossOrigin: true,
		attribution: _MapProviderAttribution
	});
}
layer.addTo(map);

map.whenReady(function () {
    $('.my-location').on('click', function () {
        map.locate({ enableHighAccurracy: true, setView: true });
    });
    //overlays.Gyms.once('add', function(e) {
    //    getGyms();
    //})
    //overlays.Spawns.once('add', function(e) {
    //    getSpawnPoints();
    //})
    //overlays.Pokestops.once('add', function(e) {
    //    getPokestops();
    //})
	//getScanAreaCoords();
	//getWorkers();
	
    overlays.Workers.hidden = true;
    getPokemon();
	
    setInterval(getPokemon, 30000);
	//setInterval(getGyms, 110000)
	//setInterval(getWorkers, 14000);
});

$("#settings>ul.nav>li>a").on('click', function(){
    // Click handler for each tab button.
    $(this).parent().parent().children("li").removeClass('active');
    $(this).parent().addClass('active');
    var panel = $(this).data('panel');
    var item = $("#settings>.settings-panel").removeClass('active')
        .filter("[data-panel='"+panel+"']").addClass('active');
});

$("#settings_close_btn").on('click', function(){
    // 'X' button on Settings panel
    $("#settings").animate({
        opacity: 0
    }, 250, function(){ $(this).hide(); });
});

$('.my-settings').on('click', function () {
    // Settings button on bottom-left corner
    $("#settings").show().animate({
        opacity: 1
    }, 250);
});

$('#reset_btn').on('click', function () {
    // Reset button in Settings>More
    if (confirm("This will reset all your preferences. Are you sure?")){
        localStorage.clear();
        location.reload();
    }
});

$('body').on('click', '.popup_filter_link', function () {
    var oldlayer;
    var id = $(this).data("pokeid");
    var layer = $(this).data("newlayer").toLowerCase();
    moveToLayer(id, layer);
    setPreference("filter-"+id, layer);
    if(layer === "pokemon") oldlayer = "trash";
    else oldlayer = "pokemon"
    var item = $("#settings button[data-id='"+id+"']");
    item.filter("[data-value='"+oldlayer+"']").removeClass("active");
    setPreference("filter-"+id, layer);
    item.filter("[data-value='"+layer+"']").addClass("active");
});

$('body').on('click', '.popup_notif_link', function () {
    var oldnotif ;
    var id = $(this).data("pokeid");
    var notif = $(this).data("newnotif").toLowerCase();
    if(notif === "rare") oldnotif = "common";
    else oldnotif = "rare"
    setPreference("notif-"+id, notif);
    var item = $("#settings button[data-id='"+id+"']");
    item.filter("[data-value='"+oldnotif+"']").removeClass("active");
    item.filter("[data-value='"+notif+"']").addClass("active");
});

$('#settings').on('click', '.settings-panel button', function () {
    //Handler for each button in every settings-panel.
    var item = $(this);
    if (item.hasClass('active')){
        return;
    }
	if (item.hasClass('savebutton')){
		return;
	}
    var id = item.data('id');
    var key = item.parent().data('group');
    var value = item.data('value');

    item.parent().children("button").removeClass("active");
    item.addClass("active");

    if (key.indexOf('filter-') > -1){
        // This is a pokemon's filter button
        moveToLayer(id, value);
		setPreference(key, value);
    }else{
        setPreference(key, value);
    }

});

function moveToLayer(id, layer){
    //setPreference("filter-"+id, layer);
    layer = layer.toLowerCase();
    for(var k in markers) {
        var m = markers[k];
        if ((k.indexOf("pokemon-") > -1) && (m !== undefined) && (m.raw.pokemon_id === id)){
            overlays.Pokemon.removeLayer(m);
            if (layer === 'pokemon'){
                m.overlay = "Pokemon";
                overlays.Pokemon.addLayer(m);
            }else if (layer === 'trash') {
                m.overlay = "Trash";
            }
        }
    }
}

function populateSettingsPanels(){
    var container = $('.settings-panel[data-panel="filters"]').children('.panel-body');
    var newHtml = '';
    for (var i = 1; i <= _pokemon_count; i++){
        var partHtml = `<div class="text-center">
                <div id="menu" class="sprite"><span class="sprite-`+i+`"></span></div>
                <div class="btn-group" role="group" data-group="filter-`+i+`">
                  <button type="button" class="btn btn-default" data-id="`+i+`" data-value="pokemon">Show</button>
                  <button type="button" class="btn btn-default" data-id="`+i+`" data-value="trash">Hide</button>
                </div>
            </div>
        `;

        newHtml += partHtml
    }
    newHtml += '</div>';
    container.html(newHtml);
    
    var containernotif = $('.settings-panel[data-panel="notif"]').children('.panel-body');
    var newHtmlnotif = '';
    for (var i = 1; i <= _pokemon_count; i++){
        var partHtmlnotif = `<div class="text-center">
                <div id="menu" class="sprite"><span class="sprite-`+i+`"></span></div>
                <div class="btn-group" role="group" data-group="notif-`+i+`">
                  <button type="button" id="notifbutton" class="btn btn-default" data-id="`+i+`" data-value="rare">On</button>
                  <button type="button" id="notifbutton" class="btn btn-default" data-id="`+i+`" data-value="common">Off</button>
                </div>
            </div>
        `;

        newHtmlnotif += partHtmlnotif
    }
    newHtmlnotif += '</div>';
    containernotif.html(newHtmlnotif);
    
	//Distance notifications
	
	if(localStorage.lat && localStorage.lon && localStorage.distance){
		$( "#lat" ).val(localStorage.lat);
		$( "#lon" ).val(localStorage.lon);
		$( "#distance" ).val(localStorage.distance);
		$( "#saved" ).val('Radius active, clear the coordinates to disable');
    }
    if(localStorage.saveC === "false"){
        $('.rightclick').addClass('button-off');
        $('.rightclick').text('Right click off!');
    }
}


function setSettingsDefaults(){
    for (var i = 1; i <= _pokemon_count; i++){
        _defaultSettings['filter-'+i] = (_defaultSettings['TRASH_IDS'].indexOf(i) > -1) ? "trash" : "pokemon";
    };

    $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
    });
    
    for (var i = 1; i <= _pokemon_count; i++){
        _defaultSettings['notif-'+i] = (_NotificationID.indexOf(i) > -1) ? "rare" : "common";
    };

    $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
    });
    
    if(!localStorage.saveC) localStorage.saveC = false;

}


function getPreference(key, ret){
    return localStorage.getItem(key) ? localStorage.getItem(key) : (key in _defaultSettings ? _defaultSettings[key] : ret);
}

function setPreference(key, val){
    localStorage.setItem(key, val);
}

$(window).scroll(function () {
    if ($(this).scrollTop() > 100) {
        $('.scroll-up').fadeIn();
    } else {
        $('.scroll-up').fadeOut();
    }
});

$("#settings").scroll(function () {
    if ($(this).scrollTop() > 100) {
        $('.scroll-up').fadeIn();
    } else {
        $('.scroll-up').fadeOut();
    }
});

$('.scroll-up').click(function () {
    $("html, body, #settings").animate({
        scrollTop: 0
    }, 500);
    return false;
});

function calculateRemainingTime(expire_at_timestamp) {
  var diff = (expire_at_timestamp - new Date().getTime() / 1000);
        var minutes = parseInt(diff / 60);
        var seconds = parseInt(diff - (minutes * 60));
        return minutes + ':' + (seconds > 9 ? "" + seconds: "0" + seconds);
}

function updateTime() {
    if (getPreference("SHOW_TIMER") === "1"){
        $(".remaining_text").each(function() {
            $(this).css('visibility', 'visible');
            $(this).css('height', '15px');
            this.innerHTML = calculateRemainingTime($(this).data('expire'));
        });
    }else{
        $(".remaining_text").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }
}

function time(s) {
    return new Date(s * 1e3).toISOString().slice(-13, -5);
}

var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (!isMobile) {
    Notification.requestPermission();
    
    
}
else{
    $('.notif-tab').remove();
}

var audio = new Audio('/static/ding.mp3');
function spawnNotification(raw) {
   if (!isMobile) {
   var theIcon = '/static/monocle-icons/icons/' + raw.pokemon_id + '.png';
   var theTitle = raw.name + ' has spawned!';
   if(showIV && raw.atk != undefined) var theBody = raw.atk+'/'+raw.def+'/'+raw.sta +' and Expires at ' + time(raw.expires_at);
   else var theBody = 'Expires at ' + time(raw.expires_at); 
    
  var options = {
    body: theBody,
    icon: theIcon,
  }
	var n = new Notification(theTitle, options);
	n.onclick = function(event) {
		event.preventDefault(); 
		window.focus();
		map.panTo(new L.LatLng(raw.lat, raw.lon));  
		n.close();
	}
	var userPreferenceNotif = getPreference('NOTIF_SOUND');
	if(userPreferenceNotif === "1"){
			audio.play();
		}
	  
	  }
		setTimeout(n.close.bind(n), 600000);
	
}


//Distance notifications
var coord;

function saveCoords() {
    if(circleon) overlays.Pokemon.removeLayer(circle);	

	if(parseFloat(document.getElementById('lat').value) && parseFloat(document.getElementById('lon').value) ) {
	   localStorage.lat = parseFloat(document.getElementById('lat').value); 
	   localStorage.lon = parseFloat(document.getElementById('lon').value); 
	   localStorage.distance = parseFloat(document.getElementById('distance').value); 
	}
	else{
		$('#saved').text('Enter a valid lat, lon and distance!');
	}

}

function checkCoords(lat, lon) {
	var coordinates = new L.LatLng(lat,lon);

	if(localStorage.lat && localStorage.lon) {
		coord = [localStorage.lat, localStorage.lon];

	}
	if(typeof coord !== 'undefined' && localStorage.distance){
		if(coordinates.distanceTo(coord) < localStorage.distance) return true;
		//console.log(coordinates.distanceTo(coord));
		
	}
	else return false;
}

var circle;
var circleon = false;

function showCircle() {
	if (circleon){
		overlays.Pokemon.removeLayer(circle);
		circleon = false;
        $('.circlebutton').text('Circle hidden');
        $('.circlebutton').addClass('button-off');
	}
	else{
		
		if(localStorage.lat && localStorage.lon && localStorage.distance){
			lat = localStorage.lat;
			lon = localStorage.lon;
			distance = localStorage.distance;
			
			circle = L.circle([lat, lon], {radius: distance});
			overlays.Pokemon.addLayer(circle);
			circleon = true;
			
            $('.circlebutton').text('Circle Shown!');
            $('.circlebutton').removeClass('button-off');
            
		}
		else{
		saveCoords();
		}
	}

}

function removeCoords() {
	localStorage.removeItem('lat');
	localStorage.removeItem('lon');
	localStorage.removeItem('distance');
	$( "#lat" ).val('');
	$( "#lon" ).val('');
	$( "#distance" ).val('');
	$( "#saved" ).text('Enter lat, long and distance to activate');
}
map.on("contextmenu", function (event) {
    if(localStorage.saveC === "true"){
    var clickcoord = event.latlng.toString();
    var secondpart = clickcoord.split(',');
    var firstpart = secondpart[0].split('(');
    secondpart = secondpart[1].split(')');
    $( '#lat' ).val(firstpart[1]);
    $( '#lon' ).val(secondpart[0]);
    if(!$( '#distance').val()) !$( '#distance').val(500);
    $( "#saved" ).text(firstpart[1] + ',' + secondpart[0]);
    }
  
});

function toggleSaveDirectly(){
    if(localStorage.saveC == 'false'){
        localStorage.saveC = true;
        $('.rightclick').removeClass('button-off');
        $('.rightclick').text('Right Click: On!');
    }
    else{
        localStorage.saveC = false;
        $('.rightclick').addClass('button-off');
        $('.rightclick').text('Right Click: Off!');
    }
    
    
}

//Populate settings and defaults
populateSettingsPanels();
setSettingsDefaults();