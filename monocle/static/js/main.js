var _last_pokemon_id = 0;
var _pokemon_count = 248;
var _WorkerIconUrl = 'static/monocle-icons/assets/ball.png';
var _NotificationIconUrl = 'static/monocle-icons/assets/ultra.png';
var _PokestopIconUrl = 'static/monocle-icons/assets/stop.png';

var _NotificationID = [0]; //This is the default list for notifications

//IV control lists, rare shows iv if it's %95+, ultralist shows ivs always, and hidden100 is the blacklist for always showing iv of 100% pokemons
//var rarelist = [228, 231, 4, 176,179,133, 116, 95, 237, 158,159,157,156, 154, 155, 152,153, 79, 123, 216, 133, 149, 83, 59, 62, 65, 68, 76, 89, 103, 112, 130, 131, 137, 143, 144, 145, 146, 150, 151, 26, 31, 34, 45, 71, 94, 113, 115, 128, 139, 141, 142, 58, 129, 63, 102, 111, 125, 147, 148, 66, 154,157,160,181,186,199,208,212,214,229,230,232,233,241,242,246,247,248, 217];
//var ultralist = [147, 217, 147, 196, 197, 137, 113, 149, 83, 59, 68,  65, 76, 89, 103, 130, 131, 143, 144, 145, 146, 150, 151, 3, 6, 9, 26, 45, 94, 115, 128, 139, 141, 142, 154,157,160,181,186,199,208,212,214,229,230,233,241,242,246,247,248, 201]
//var hidden100 = [10, 11, 13, 14, 16, 17, 41, 161, 163, 165,167,177,183,190,194, 198, 220];

var PokemonIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, -15]
    },
    createIcon: function() {
        var div = document.createElement('div');
        div.innerHTML =
            '<div class="pokemarker">' +
              '<div class="pokeimg">' +
                   '<img class="leaflet-marker-icon" src="' + this.options.iconUrl + '" />' +
              '</div>' +
              //'<div class="remaining_text_iv '+ this.options.rare +'" id="iv'+this.options.ivrange +'">' + this.options.iv.toFixed(0) +'%</div>' +
              '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
            '</div>';
        return div;
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
var NotificationIcon = L.Icon.extend({
    options: {
        iconSize: [30, 30],
        className: 'notification-icon',
        iconUrl: _NotificationIconUrl
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
    
	/*
	if(item.atk != undefined){
        var totaliv = 100 * (item.atk + item.def + item.sta) / 45;
        content += ' - <b>' + totaliv.toFixed(2) + '%</b></br>';
        content += 'Disappears in: ' + expires_at + '<br>';
        content += 'Move 1: ' + item.move1 + '</br>';
        content += 'Move 2: ' + item.move2 + '<br>';
    } else {
        content += '<br>Disappears in: ' + expires_at + '<br>';
    }
	*/
	content += '<br>Disappears in: ' + expires_at + '<br>';
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
    /*var ivrange = 0;
    var rare = "notrare";
    var totaliv = 100 * (raw.atk + raw.def + raw.sta) / 45;
    if (rarelist.includes(raw.pokemon_id) && totaliv > 80 || ultralist.includes(raw.pokemon_id)) rare = "israre";
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
	*/
    var icon = new PokemonIcon({iconUrl: '/static/monocle-icons/icons/' + raw.pokemon_id + '.png', expires_at: raw.expires_at});
    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1});

    var intId = parseInt(raw.id.split('-')[1]);
    if (_last_pokemon_id < intId){
        _last_pokemon_id = intId;
    }
    
    /*var ishidden100 = hidden100.includes(raw.pokemon_id);
    if (totaliv==100 && !ishidden100){
        marker.overlay = 'Pokemon';
    } 
	*/
    if (raw.trash) {
        marker.overlay = 'Trash';
    } 
    else {
        marker.overlay = 'Pokemon';
    }
    var userPreference = getPreference('filter-'+raw.pokemon_id);
    /*
	if (totaliv==100 && !ishidden100){
        marker.overlay = 'Pokemon';
    } 
	*/
    if (userPreference === 'pokemon'){
        marker.overlay = 'Pokemon';
    }else if (userPreference === 'trash'){
        marker.overlay = 'Trash';
    }else if (userPreference === 'hidden'){
        marker.overlay = 'Hidden';
    }
    
    var userPreferenceNotif = getPreference('notif-'+raw.pokemon_id);
    if(userPreferenceNotif === 'rare'){
        spawnNotification(raw);
    }
    
    marker.raw = raw;
    markers[raw.id] = marker;
    marker.on('popupopen',function popupopen (event) {
		event.popup.options.autoPan = true; // Pan into view once
        event.popup.setContent(getPopupContent(event.target.raw));
        event.target.popupInterval = setInterval(function () {
            event.popup.setContent(getPopupContent(event.target.raw));
			event.popup.options.autoPan = false; // Don't fight user panning
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
        var pokemonName;
        if (raw.team === 0) {
            event.popup.setContent('An empty Gym!');
        } else {
            event.popup.setContent('Prestige: <b>' + raw.prestige + '</b><br>Guarding Pokemon:<br><b>' + '#' + raw.pokemon_id + ' ' + raw.pokemon_name + '</b>');
        }
    });
    marker.bindPopup();
    return marker;
}

function WorkerMarker (raw) {
    if (raw.sent_notification === true) {
        var icon = new NotificationIcon();
    } else {
        var icon = new WorkerIcon();
    }
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
        var popup = '<b>Spawn ' + item.spawn_id + '</b><br/>time: ';
        var time = '??';
        if (item.despawn_time != null) {
            time = item.despawn_time;
        }
        else {
            circle.setStyle({color: '#f03'})
        }
        popup += time + '<br/>duration: ';
        popup += item.duration == null ? '30mn' : item.duration + 'mn';
        circle.bindPopup(popup);
        circle.addTo(overlays.Spawns);
    });
}

function addPokestopsToMap (data, map) {
    data.forEach(function (item) {
        var icon = new PokestopIcon();
        var marker = L.marker([item.lat, item.lon], {icon: icon});
        marker.raw = item;
        marker.bindPopup('<b>Pokestop ' + item.external_id + '</b>');
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
if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) 
{
	var layer = L.tileLayer(_MapProviderUrl, {
    opacity: 0.80,
	useCache: false,
    attribution: _MapProviderAttribution
	});
}
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
    var id = item.data('id');
    var key = item.parent().data('group');
    var value = item.data('value');

    item.parent().children("button").removeClass("active");
    item.addClass("active");

    if (key.indexOf('filter-') > -1){
        // This is a pokemon's filter button
        moveToLayer(id, value);
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
                <img src="static/monocle-icons/icons/`+i+`.png">
                <div class="btn-group" role="group" data-group="filter-`+i+`">
                  <button type="button" class="btn btn-default" data-id="`+i+`" data-value="pokemon">Pokémon</button>
                  <button type="button" class="btn btn-default" data-id="`+i+`" data-value="trash">Trash</button>
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
                <img src="static/monocle-icons/icons/`+i+`.png">
                <div class="btn-group" role="group" data-group="notif-`+i+`">
                  <button type="button" id="notifbutton" class="btn btn-default" data-id="`+i+`" data-value="rare">Notify On</button>
                  <button type="button" id="notifbutton" class="btn btn-default" data-id="`+i+`" data-value="common">Notify Off</button>
                </div>
            </div>
        `;

        newHtmlnotif += partHtmlnotif
    }
    newHtmlnotif += '</div>';
    containernotif.html(newHtmlnotif);
    
    
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
    
}
populateSettingsPanels();
setSettingsDefaults();

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

var audio = new Audio('/static/ding.mp3');
function spawnNotification(raw) {
   if (!isMobile) {
   var theIcon = '/static/monocle-icons/icons/' + raw.pokemon_id + '.png';
   var theTitle = raw.name + ' has spawned!';
   //var theBody = raw.atk+'/'+raw.def+'/'+raw.sta +' and Expires at ' + time(raw.expires_at); 
   var theBody = 'Expires at ' + time(raw.expires_at); 
    
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