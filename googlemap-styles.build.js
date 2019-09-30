/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, GoogleMap, window*/
(function ($) {

    /**
     * Zajišťuje inicializaci map po spojení s Googlem.
     *
     * K GoogleMaps.onInit lze přiřadit funkci, která se spustí při inicializaci.
     */
    var GoogleMaps = window.GoogleMaps = (function GoogleMaps() {

            var maps = [],

                initialized = false,

                defer = $.Deferred(),

                /*
                 * Přidá novou GoogleMap a inicializuje ji, pokud již byly Google Maps inicializovány.
                 *
                 * map - instance GoogleMap.
                 * */
                addMap = function (map) {

                    if (!(map instanceof GoogleMap)) {

                        return false;
                    }

                    maps.push(map);

                    if (initialized) {

                        map.init();
                    }

                    return map;
                },

                /**
                 * Inicializuje připravené GoogleMapy.
                 */
                init = function () {

                    maps.forEach(function (map) {

                        map.init();
                    });

                    initialized = true;
                };

            /*Funkce, kterou zavolá skript Googlu (nastavená v callbacku).*/
            window.googleMapsInit = function googleMapsInit() {

                defer.resolve(maps);
                defer.then(init);
            };

            return {
                addMap: addMap,

                promise: function () {

                    return defer.promise();
                }
            };

        }());

}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google, HTMLElement, GoogleMapHTMLOverlay, GoogleMaps, GoogleMapStyle*/

(function ($) {

    /*
     * Vytvoří novou mapu.
     *
     * options - {
     *     el: "#map" | $() | HTMLElement, - element, do kterého se vloží mapa
     *     coords: [50.0879712, 14.4172372] | LatLng, - souřadnice "výchozího místa" (použije se jako střed mapy, což lze přepsat v options)
     *     icon: "marker.png", - obrázek pro vlastní pin
     *     markers: [{icon: "marker.png", coords: [], info: "", options: {}, id: "" | 0, group: ""}], - více vlastních pinů
     *     addMarker: false, - jestli přidávat marker, pokud není nastaveno icon
     *     html: "" | HTMLElement | {html: "" | HTMLElement, coords: [] | Marker | LatLng, draw: function} | [...] - html obsah na mapě
     *     zoom: 14, - přiblížení mapy
     *     styles: [] | GoogleMapStyle, - styl mapy
     *     info: "", - informace zobrazující se u výchozího markeru
     *     options: {}, - nastavení přidávající k mapě další nastavení
     *     controls: false, - ne/zobrazovat všechny ovládací prvky (lze přepsat v options)
     *     centerToLocationOnResize: 0 | true - vycentrovat mapu na coords při změně velikosti okna (pokud je zadáno coords) | číslo nastavuje, za jak dlouho po události resize považovat změnu velikosti za ukončenou
     *     fitBoundsOnResize: 0 | true - nastvit mapu při změně velikosti okna, aby byly vidět všechny markery (pokud není zadáno coords) | číslo nastavuje, za jak dlouho po události resize považovat změnu velikosti za ukončenou
     * }
     * */
    var DEFAUlTS = { /*Výchozí nastavení je možné změnit v GoogleMap.DEFAULTS.*/
            el: "#map",

            zoom: 14,
            controls: false,
            styles: [],
            centerToLocationOnResize: 0,
            fitBoundsOnResize: 0
        },

        GoogleMap = window.GoogleMap = function GoogleMap(options) {

            if (typeof options !== "object") {

                throw "Options required.";
            }

            this.options = $.extend({}, DEFAUlTS, options);

            if (!this.options.el) {

                this.options.el = GoogleMap.DEFAULTS.el;
            }

            if (!this.options.zoom) {

                this.options.zoom = GoogleMap.DEFAULTS.zoom;
            }

            if (!this.options.styles) {

                this.options.styles = GoogleMap.DEFAULTS.styles;
            }

            this.options.styles.googleMap = this;

            this.el = null;
            this.$el = null;
            this.map = null;

            this._noCoordsOnInit = !this.options.coords;

            this._animations = {};
            this._$animEl = $("<div></div>");

            this._idHTMLCounter = 0;
            this._idMarkerCounter = 0;
            this._idInfoCounter = 0;

            this._markers = [];
            this._markersDefers = {};
            this._infos = [];
            this._infosDefers = {};
            this._htmls = [];
            this._htmlsDefers = {};

            this.markers = {};
            this.groupedMarkers = {};
            this.infos = {};
            this.HTMLs = {};

            this.markerId = null;
            this.infoId = null;
            this.HTMLId = null;

            this._defer = $.Deferred();

            GoogleMaps.addMap(this);
        },

        generateId = function (type) {

            switch (type) {

                case "HTML"  : return !this.HTMLs[++this._idHTMLCounter]     ? this._idHTMLCounter   : generateId.call(this, type);
                case "Marker": return !this.markers[++this._idMarkerCounter] ? this._idMarkerCounter : generateId.call(this, type);
                case "Info"  : return !this.infos[++this._idInfoCounter]     ? this._idInfoCounter   : generateId.call(this, type);
            }
        },

        closeAllInfos = function () {

            $.each(this.infos, function (id, info) {

                info.close();
            });
        },

        initInfoEvents = function (info, marker) {

            var touch = false,

                _this = this;

            google.maps.event.addListener(marker, "touchend", function() {

                touch = true;

                closeAllInfos.call(_this);

                info.open(this.map, this);
            });

            google.maps.event.addListener(marker, "click", function() {

                if (touch) {

                    touch = false;

                    return;
                }

                closeAllInfos.call(_this);

                info.open(this.map, this);
            });
        };

    GoogleMap.DEFAULTS = DEFAUlTS;

    GoogleMap.STYLES = {};

    /*Prázdný styl.*/
    GoogleMap.STYLES.empty = function () {

        return [];
    };

    /**
     * Inicializuje mapu včetně markerů, infoboxů a html.
     */
    GoogleMap.prototype.init = function () {

        this.bounds = new google.maps.LatLngBounds();

        this.$el = this.options.el.jquery ? this.options.el : $(this.options.el);
        this.el = this.$el[0];

        var mapOptions = {
            zoom: this.options.zoom
        };

        if (this.options.coords instanceof google.maps.LatLng) {

            mapOptions.location = this.options.coords;

        } else if (this.options.coords) {

            mapOptions.location = new google.maps.LatLng(this.options.coords[0], this.options.coords[1]);
        }

        mapOptions.styles = this.options.styles || (window.GoogleMapStyle ? new GoogleMapStyle(): GoogleMap.STYLES.empty());

        mapOptions.center = mapOptions.location;

        if (!this.options.controls && !GoogleMap.DEFAULTS.controls) {

            mapOptions.zoomControl = false;
            mapOptions.mapTypeControl = false;
            mapOptions.scaleControl = false;
            mapOptions.streetViewControl = false;
            mapOptions.rotateControl = false;
            mapOptions.fullscreenControl = false;
        }

        if (this.options.options) {

            mapOptions = $.extend({}, mapOptions, this.options.options);
        }

        this.map = new google.maps.Map(this.el, mapOptions);

        if (this.options.centerToLocationOnResize) {

            this.initCenterToLocationOnResize(this.options.centerToLocationOnResize);
        }

        if (this.options.fitBoundsOnResize) {

            this.initFitBoundsOnResize(this.options.fitBoundsOnResize);
        }

        this.initialized = true;

        if (this.options.icon || this.options.addMarker) {

            this.markerId = generateId.call(this, "Marker");

            if (this.options.info) {

                this.infoId = generateId.call(this, "Info");
            }

            this.addMarker({
                coords: mapOptions.location,
                icon: this.options.icon,
                info: this.options.info,
                infoId: this.options.infoId,
                id: this.markerId
            });
        }

        if (this.options.markers) {

            this.options.markers.forEach(this.addMarker.bind(this));
        }

        if (this.options.html) {

            if (this.options.html instanceof Array) {

                this.options.html.forEach(this.addHTML.bind(this));

            } else {

                this.HTMLId = generateId.call(this, "HTML");

                this.addHTML({
                    html: this.options.html,
                    id: this.HTMLId
                });
            }
        }

        this._markers.forEach(this.addMarker.bind(this));
        this._infos.forEach(this.addInfo.bind(this));
        this._htmls.forEach(this.addHTML.bind(this));

        if (this._noCoordsOnInit) {

            this.fitBounds();
        }

        if (typeof this.options.onInit === "function") {

            this.options.onInit.call(this);
        }

        this._defer.resolve(this, this.markers[this.markerId], this.markerId);
    };

    GoogleMap.prototype.promise = function () {

        return this._defer.promise();
    };

    /**
     * Přidá k mapě marker. Vrátí Promise.
     * Všechny markery jsou v instance.markers.
     *
     * options - {
     *     coords: [1, 1] | LatLng, - souřadnice markeru
     *     icon: "marker.png", - ikona markeru
     *     options: {}, - ostatní nastavení markeru
     *     info: "" - informace zobrazované u markeru
     *     id: id Markeru, podle kterého je možné najít příslušný objekt
     *     infoId: id Infa, podle kterého je možné najít příslušný objekt,
     *     group: "" - skupina markerů
     * }
     */
    GoogleMap.prototype.addMarker = function (options) {

        options = options || {};

        var id = options.id || generateId.call(this, "Marker"),

            defer = this._markersDefers[options.id] || $.Deferred();

        if (!this.initialized) {

            options.id = options.id || id;

            this._markers.push(options);
            this._markersDefers[options.id] = defer;

            return defer.promise();
        }

        if (options.coords && !(options.coords instanceof google.maps.LatLng)) {

            options.coords = new google.maps.LatLng(options.coords[0], options.coords[1]);
        }

        var markerOptions = {
            position: options.coords || this.map.location,
            map: this.map,
            icon: options.icon || this.options.icon
        };

        if (options.options) {

            markerOptions = $.extend({}, markerOptions, options.options);
        }

        var marker = new google.maps.Marker(markerOptions);

        if (options.info) {

            this.addInfo({
                content: options.info,
                marker: marker,
                id: options.infoId
            });
        }

        this.markers[id] = marker;

        options.group = options.group || "no-group";

        this.groupedMarkers[options.group] = this.groupedMarkers[options.group] || {};
        this.groupedMarkers[options.group][id] = marker;

        this.bounds.extend(marker.position);

        defer.resolve(this, marker, id);

        return defer.promise();
    };

    /**
     * Vrátí instanci InfoWindow podle id.
     *
     * id - id Markeru
     */
    GoogleMap.prototype.getMarker = function (id) {

        return this.markers[id] || null;
    };

    /**
     * Přidá informace k markeru. Vrátí Promise.
     * Info se zobrazuje při kliknutí (a touchend) na pin. Všechny info jsou v instance.infos.
     *
     * options - {
     *     content: "", - obsah
     *     options: {}, - další nastavení
     *     marker: Marker - marker, ke kterému se má info přiřadit (pokud není nastaveno použije se poslední)
     *     id: id Infa, podle kterého je možné najít příslušný objekt
     * }
     */
    GoogleMap.prototype.addInfo = function (options) {

        options = options || {};

        var id = options.id || generateId.call(this, "Info"),

            defer = this._infosDefers[options.id] || $.Deferred();

        if (!this.initialized) {

            options.id = options.id || id;

            this._infos.push(options);
            this._infosDefers[options.id] = defer;

            return defer.promise();
        }

        options.marker = options.marker || this.markers[this.markers.length - 1];

        var infoOptions = {
            content: options.content
        };

        if (options.options) {

            infoOptions = $.extend({}, infoOptions, options.options);
        }

        var info = new google.maps.InfoWindow(infoOptions);

        initInfoEvents.call(this, info, options.marker);

        this.infos[id] = info;

        defer.resolve(this, info, id);

        return defer.promise();
    };

    /**
     * Vrátí instanci InfoWindow podle id.
     *
     * id - id Infa
     */
    GoogleMap.prototype.getInfo = function (id) {

        return this.infos[id] || null;
    };

    /**
     * Přidá do mapy vlastní HTML obsah. Vrátí Promise.
     * Všechny HTML jsou v instance.HTMLs.
     *
     * options - "<div></div>" | {
     *     html: "" | HTMLElement, - vlastní HTML obsah
     *     coords: [1, 1] | LatLng | Marker, - souřadnice, kam vložit HTML (pokud není nastaveno, použije se location mapy)
     *     draw: function, - vlastní funkce zajišťující vykreslení HTML
     *     id: id HTML, podle kterého je možné najít příslušný objekt
     * }
     */
    GoogleMap.prototype.addHTML = function (options) {

        options = options || {};

        var id = options.id || generateId.call(this, "HTML"),

            defer = this._htmlsDefers[options.id] || $.Deferred();

        if (!this.initialized) {

            if (typeof options === "string") {

                options = {
                    html: options,
                    id: id
                };

            } else {

                options.id = options.id || id;
            }

            this._htmls.push(options);
            this._htmlsDefers[options.id] = defer;

            return defer.promise();
        }

        var html = typeof options === "string" || options instanceof HTMLElement ? options : options.html,
            position = typeof options === "object" && !(options instanceof HTMLElement) ? options.coords : null,
            draw = typeof options === "object" && !(options instanceof HTMLElement) ? options.draw : null,

            overlay,

            resolve = function () { defer.resolve(this, overlay, id); }.bind(this);

        overlay = new GoogleMapHTMLOverlay(this.map, html, position, draw, resolve);

        this.HTMLs[id] = overlay;

        return defer.promise();
    };

    /**
     * Vrátí instanci GoogleMapHTMLOverlay podle id.
     *
     * id - id HTML
     */
    GoogleMap.prototype.getHTML = function (id) {

        return this.HTMLs[id] || null;
    };

    /**
     * Při změně velikosti okna zarovná mapu na střed location.
     *
     * ms (Number) - debouncing
     */
    GoogleMap.prototype.initCenterToLocationOnResize = function (ms) {

        if (this.resizeCenterToLocationInitialized) {

            return;
        }

        var debounce = typeof ms === "number",

            _this = this;

        google.maps.event.addDomListener(window, "resize", function () {

            if (debounce) {

                clearTimeout(debounce);

                debounce = setTimeout(_this.centerToLocation.bind(_this), ms);

                return;
            }

            _this.centerToLocation();
        });

        this.resizeCenterToLocationInitialized = true;
    };

    /**
     * Při změně velikosti okna zarovná mapu tak, aby byly vidět všechny markery.
     *
     * ms (Number) - debouncing
     */
    GoogleMap.prototype.initFitBoundsOnResize = function (ms) {

        if (this.resizeFitBoundsInitialized) {

            return;
        }

        var debounce = typeof ms === "number",

            _this = this;

        google.maps.event.addDomListener(window, "resize", function () {

            if (debounce) {

                clearTimeout(debounce);

                debounce = setTimeout(_this.fitBounds.bind(_this), ms);

                return;
            }

            _this.fitBounds();
        });

        this.resizeFitBoundsInitialized = true;
    };

    /**
     * Zarovná mapu na střed location.
     */
    GoogleMap.prototype.centerToLocation = function () {

        this.map.setCenter(this.map.location);
    };

    /**
     * Zarovná mapu tak, aby byly viddět všechny markery.
     */
    GoogleMap.prototype.fitBounds = function () {

        this.map.fitBounds(this.bounds);
    };

    /**
     * Zarovná mapu na střed zadaného objektu.
     *
     * object (String) - id Markeru nabo HTML
     * object (LatLng, Array) - souřadnice
     */
    GoogleMap.prototype.center = function (object) {

        if (typeof object === "string" || typeof object === "number") {

            object = this.getMarker(object) || this.getHTML(object);
        }

        if (object instanceof Array) {

            object = new google.maps.LatLng(object[0], object[1]);
        }

        if (object instanceof google.maps.LatLng) {

            this.map.setCenter(object);

        } else if (object && object.position) {

            this.map.setCenter(object.position);

        } else {

            this.centerToLocation();
        }
    };

    /**
     * Aktivuje animaci zadaného Markeru.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     * animation (google.maps.Animation) - typ animace (Výchozí: BOUNCE)
     */
    GoogleMap.prototype.animate = function (marker, duration, animation) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        if (marker) {

            var animId = marker.getPosition().toString();

            clearTimeout(this._animations[animId]);

            if (marker.getAnimation() !== null) {

                marker.setAnimation(null);
            }

            marker.setAnimation(animation || google.maps.Animation.BOUNCE);

            this._animations[animId] = setTimeout(marker.setAnimation.bind(marker, null), duration || 2800);
        }
    };

    /**
     * Aktivuje animaci skupiny Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     * animation (google.maps.Animation) - typ animace (Výchozí: BOUNCE)
     */
    GoogleMap.prototype.animateGroup = function (group, duration, animation) {

        $.each(this.groupedMarkers[group], function (i, marker) {

            this.animate(marker, duration, animation);

        }.bind(this));
    };

    /**
     * Nastaví zadanému Markeru opacity.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * opacity (Number) - opacity
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.opacity = function (marker, opacity, duration, easing) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        if (marker && duration) {

            var initOpacity;

            this._$animEl.stop(true, true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    if (typeof initOpacity !== "number") {

                        initOpacity = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                    }

                    var toAnimate = initOpacity - opacity;

                    if (toAnimate) {

                        marker.setOpacity(initOpacity - (toAnimate * pct));
                    }

                    if (!marker.getVisible() && opacity > 0) {

                        marker.setVisible(true);
                    }

                    if (opacity === 0 && pct === 1) {

                        marker.setVisible(false);
                    }
                },
                easing: easing || "linear"
            });

            return;
        }

        marker.setOpacity(opacity);

        marker.setVisible(opacity > 0);
    };

    /**
     * Nastaví opacity skupině Markerů.
     *
     * group (String) - název skupiny
     * opacity (Number) - opacity
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.groupOpacity = function (group, opacity, duration, easing) {

        if (duration) {

            var initOpacity = [];

            this._$animEl.stop(true, true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.groupedMarkers[group], function (m, marker) {


                        if (typeof initOpacity[m] !== "number") {

                            initOpacity[m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                        }

                        var toAnimate = initOpacity[m] - opacity;

                        if (toAnimate) {

                            marker.setOpacity(initOpacity[m] - (toAnimate * pct));
                        }

                        if (!marker.getVisible() && opacity > 0) {

                            marker.setVisible(true);
                        }

                        if (opacity === 0 && pct === 1) {

                            marker.setVisible(false);
                        }

                    }.bind(this));
                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.groupedMarkers[group], function (m, marker) {

            marker.setOpacity(opacity);

            marker.setVisible(opacity > 0);

        }.bind(this));
    };

    /**
     * Zobrazí zadaný Marker.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.show = function (marker, duration, easing) {

        this.opacity(marker, 1, duration, easing);
    };

    /**
     * Zobrazí skupinu Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.showGroup = function (group, duration, easing) {

        this.groupOpacity(group, 1, duration, easing);
    };

    /**
     * Skryje zadaný Marker.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     */
    GoogleMap.prototype.hide = function (marker, duration, easing) {

        this.opacity(marker, 0, duration, easing);
    };

    /**
     * Srkyje skupinu Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     */
    GoogleMap.prototype.hideGroup = function (group, duration, easing) {

        this.groupOpacity(group, 0, duration, easing);
    };

    /**
     * Zvýrazní zadaný marker.
     *
     * markerToHightlight (String, Marker, Boolean) - id Markeru nebo Marker; pokud je false, zvýraznění se zruší
     * opacity (Number) - jakou opacity mají mít ostatní markery
     * duration (Number) - délka animace
     * easing (String) - easing
    */
    GoogleMap.prototype.highlight = function (markerToHightlight, duration, opacity, easing) {

        opacity = opacity || 0;

        if (typeof markerToHightlight === "string" || typeof markerToHightlight === "number") {

            markerToHightlight = this.getMarker(markerToHightlight);
        }

        if (duration) {

            var initOpacity = [];

            this._$animEl.stop(true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.markers, function (m, marker) {

                        if (typeof initOpacity[m] !== "number") {

                            initOpacity[m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                        }

                        var targetOpacity = marker !== markerToHightlight && markerToHightlight !== false ? opacity : 1,

                            toAnimate = initOpacity[m] - targetOpacity;

                        if (toAnimate) {

                            marker.setOpacity(initOpacity[m] - (toAnimate * pct));
                        }

                        if (targetOpacity === 0 && pct === 1) {

                            marker.setVisible(false);
                        }

                        if (targetOpacity > 0 && !marker.getVisible()) {

                            marker.setVisible(true);
                        }
                    });

                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.markers, function (m, marker) {

            if (opacity) {

                marker.setOpacity(marker === markerToHightlight || markerToHightlight === false ? 1 : opacity);

                if (marker === markerToHightlight || markerToHightlight === false || opacity > 0) {

                    marker.setVisible(true);
                }

                if (marker !== markerToHightlight && markerToHightlight === false && opacity === 0) {

                    marker.setVisible(false);
                }

            } else {

                if (marker === markerToHightlight || markerToHightlight === false) {

                    marker.setOpacity(1);
                }

                marker.setVisible(marker === markerToHightlight || markerToHightlight === false);
            }
        });
    };

    /**
     * Zvýrazní skupinu Markerů.
     *
     * groupToHighlight (String, Boolean) - název skupiny; pokud je false, zvýraznění se odstraní
     * opacity (Number) - jakou opacity mají mít ostatní markery
     * duration (Number) - délka animace
     * easing (String) - easing
    */
    GoogleMap.prototype.highlightGroup = function (groupToHighlight, duration, opacity, easing) {

        opacity = opacity || 0;

        if (duration) {

            var initOpacity = {};

            this._$animEl.stop(true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.groupedMarkers, function (group) {

                        if (typeof initOpacity[group] !== "object") {

                            initOpacity[group] = [];
                        }

                        $.each(this.groupedMarkers[group], function (m, marker) {

                            if (typeof initOpacity[group][m] !== "number") {

                                initOpacity[group][m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                            }

                            var targetOpacity = group !== groupToHighlight && groupToHighlight !== false ? opacity : 1,

                                toAnimate = initOpacity[group][m] - targetOpacity;

                            if (toAnimate) {

                                marker.setOpacity(initOpacity[group][m] - (toAnimate * pct));
                            }

                            if (targetOpacity === 0 && pct === 1) {

                                marker.setVisible(false);
                            }

                            if (targetOpacity > 0 && !marker.getVisible()) {

                                marker.setVisible(true);
                            }

                        }.bind(this));

                    }.bind(this));

                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.groupedMarkers, function (group) {

            $.each(this.groupedMarkers[group], function (m, marker) {

                if (opacity) {

                    marker.setOpacity(group === groupToHighlight || groupToHighlight === false ? 1 : opacity);

                    if (group === groupToHighlight || groupToHighlight === false || opacity > 0) {

                        marker.setVisible(true);
                    }


                    if (group !== groupToHighlight && groupToHighlight === false && opacity === 0) {

                        marker.setVisible(false);
                    }

                } else {

                    if (group === groupToHighlight || groupToHighlight === false) {

                        marker.setOpacity(1);
                    }

                    marker.setVisible(group === groupToHighlight || groupToHighlight === false);
                }

            }.bind(this));
        }.bind(this));
    };

    /**
     * Přiřadí k mapě event listener a vrátí jeho instanci.
     *
     * type (String) - typ události (click, ...)
     * cb (Function) - funkce, která se má spustit při události
     */
    GoogleMap.prototype.on = function (type, cb) {

        return this.map.addListener(type, cb);
    };

    /*
     * Odstraní z mapy event listener.
     *
     * listener - instance event listeneru
     */
    GoogleMap.prototype.off = function (listener) {

        this.map.removeListener(listener);
    };

    /**
     * Přiřadí k Markeru event listener a vrátí jeho instanci.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * type (String) - typ události (click, ...)
     * cb (Function) - funkce, která se má spustit při události
     */
    GoogleMap.prototype.onMarker = function (marker, type, cb) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        return google.maps.event.addListener(marker, type, cb);
    };

    /*
     * Odstraní z Markeru event listener.
     *
     * listener - instance event listeneru
     */
    GoogleMap.prototype.offMarker = function (listener) {

        google.maps.event.removeListener(listener);
    };

}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google, GoogleMaps*/

(function ($) {

    /**
     * Třída zajišťující vložení vlastního HTML do mapy.
     *
     * map - instance Map
     * html (String | HTMLElement) - HTML obsah
     * position - [1, 1] | LatLng | Marker - suřadnice, kam HTML vložit (pokud není nastaveno, použije se location mapy)
     * drawFn (Function) - vlastní funkce pro vykreslení HTML na mapě
     */
    var GoogleMapHTMLOverlay = window.GoogleMapHTMLOverlay = function GoogleMapHTMLOverlay(map, html, position, drawFn, resolve) {

        this.html = html;

        this.$el = null;
        this.el = null;

        this.map = map;

        this._resolve = resolve;

        if (drawFn) {

            this.draw = drawFn;
        }

        if (position instanceof google.maps.LatLng) {

            this.position = position;

        } else if (position instanceof google.maps.Marker) {

            this.position = position.position;

        } else if (position instanceof Array) {

            this.position = new google.maps.LatLng(position[0], position[1]);

        } else {

            this.position = this.map.location;
        }

        this.setMap(map);
    };

    /*Prototype GoogleMapHTMLOverlay je potřeba nastavit až po inicializaci, protože potřebujeme globální objekt google.*/
    GoogleMaps.promise().then(function () {

        GoogleMapHTMLOverlay.prototype = new google.maps.OverlayView();

        /*
         * Povinná metoda pro přidání mapy.
         * */
        GoogleMapHTMLOverlay.prototype.onAdd = function() {

            var panes = this.getPanes();

            this.$el = $("<div></div>");

            this.$el
                .css("position", "absolute")
                .html(this.html)
                .appendTo(panes.overlayMouseTarget);

            this.el = this.$el[0];

            this._resolve();
        };

        /*
         * Povinná metoda pro vykreslení mapy.
         * Zarovná HTML doprostřed nad souřadnice.
         * */
        GoogleMapHTMLOverlay.prototype.draw = function() {

            var overlayProjection = this.getProjection();

            this.pxPosition = overlayProjection.fromLatLngToDivPixel(this.position);

            this.size = {
                width: this.el.offsetWidth || (this.size ? this.size.width: 0),
                height: this.el.offsetHeight || (this.size ? this.size.height: 0)
            };

            if (this.size.width && this.size.height) {

                this.el.style.left = (this.pxPosition.x - (this.size.width / 2)) + "px";
                this.el.style.top = (this.pxPosition.y - this.size.height) + "px";
            }
        };

        /*
         * Povinná metoda pro odstranění HTML.
         */
        GoogleMapHTMLOverlay.prototype.onRemove = function() {

            this.$el.remove();

            this.$el = null;
            this.el = null;
        };

        /*
         * Následující funkce volají stejnojmenné funkce jQuery (kromě show/hide, které fungují jako fadeIn/fadeOut) na nejvyšším elementu HTML.
         */

        /*pokud je animate false, duration se nastaví na 0*/
        GoogleMapHTMLOverlay.prototype.show = function(animate) {

            var args = Array.prototype.slice.call(arguments);

            if (animate === false) {

                args[0] = 0;
            }

            return this.$el.fadeIn.apply(this.$el, args);
        };

        /*pokud je animate false, duration se nastaví na 0*/
        GoogleMapHTMLOverlay.prototype.hide = function(animate) {

            var args = Array.prototype.slice.call(arguments);

            if (animate === false) {

                args[0] = 0;
            }

            return this.$el.fadeOut.apply(this.$el, args);
        };

        GoogleMapHTMLOverlay.prototype.animate = function() {

            return this.$el.animate.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.css = function() {

            return this.$el.css.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.find = function() {

            return this.$el.find.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.addClass = function() {

            return this.$el.addClass.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.removeClass = function() {

            return this.$el.removeClass.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.hasClass = function() {

            return this.$el.hasClass.apply(this.$el, arguments);
        };
    });


}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window*/

(function ($) {

    /* Objekt sloužící zejména pro nápovědu v editoru,
     * jaké vlastnosti mapy je možné stylovat.
     */

    var GoogleMapFeature = window.GoogleMapFeature = {
        all: "all",

        administrative: {
            toString: function () { return "administrative"; },
            country: "administrative.country",
            landParcel: "administrative.land_parcel",
            locality: "administrative.locality",
            neighborhood: "administrative.neighborhood",
            province: "administrative.province"
        },

        country: "administrative.country",
        landParcel: "administrative.land_parcel",
        locality: "administrative.locality",
        neighborhood: "administrative.neighborhood",
        province: "administrative.province",

        landscape: {
            toString: function () { return "landscape"; },
            manMade: "landscape.man_made",
            natural: {
                toString: function () { return "landscape.natural"; },
                landcover: "landscape.natural.landcover",
                terrain: "landscape.natural.terrain"
            }
        },

        manMade: "landscape.man_made",
        natural: "landscape.natural",
        landcover: "landscape.natural.landcover",
        terrain: "landscape.natural.terrain",

        poi: {
            toString: function () { return "poi"; },
            attraction: "poi.attraction",
            business: "poi.business",
            government: "poi.government",
            medical: "poi.medical",
            park: "poi.park",
            placeOfWorship: "poi.place_of_worship",
            school: "poi.school",
            sportsComplex: "poi.sports_complex"
        },

        attraction: "poi.attraction",
        business: "poi.business",
        government: "poi.government",
        medical: "poi.medical",
        park: "poi.park",
        placeOfWorship: "poi.place_of_worship",
        school: "poi.school",
        sports: "poi.sports_complex",

        road: {
            toString: function () { return "road"; },
            arterial: "road.arterial",
            highway: {
                toString: function () { return "road.highway"; },
                controlledAccess: "road.highway.controlled_access"
            },
            local: "road.local"
        },

        arterialRoad: "road.arterial",
        highway: "road.highway",
        controlledAccessHighway: "road.highway.controlled_access",
        localRoad: "road.local",

        transit: {
            toString: function () { return "transit"; },
            line: "transit.line",
            station: {
                toString: function () { return "transit.station"; },
                airport: "transit.station.airport",
                bus: "transit.station.bus",
                rail: "transit.station.rail"
            }
        },

        transitLine: "transit.line",
        station: "transit.station",
        airport: "transit.station.airport",
        bus: "transit.station.bus",
        rail: "transit.station.rail",

        water: "water"
    };

}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window*/

(function ($) {

    /* Objekt sloužící zejména pro nápovědu v editoru,
     * jaké elementy vlastností je možné stylovat.
     */

    var GoogleMapElement = window.GoogleMapElement = {
        all: "all",

        geometry: {
            toString: function () { return "geometry"; },
            fill: "geometry.fill",
            stroke: "geometry.stroke"
        },

        fill: "geometry.fill",
        stroke: "geometry.stroke",

        labels: {
            toString: function () { return "labels"; },
            icon: "labels.icon",
            text: {
                toString: function () { return "labels.text"; },
                fill: "labels.text.fill",
                stroke: "labels.text.stroke"
            }
        },

        icon: "labels.icon",
        text: "labels.text",
        textFill: "labels.text.fill",
        textStroke: "labels.text.stroke"
    };

}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window*/

(function ($) {

    /* Objekt sloužící zejména pro nápovědu v editoru,
     * jaké možnosti stylů jsou k dispozici.
     */

    var GoogleMapStyler = window.GoogleMapStyler = {
        hue: "hue",
        lightness: "lightness",
        gamma: "gamma",
        invertLightness: {
            toString: function () { return "invert_lightness"; },
            "true": true,
            "false": false
        },
        visibility: {
            toString: function () { return "visibility"; },
            on: "on",
            off: "off",
            simplified: "simplified"
        },
        color: "color",
        weight: "weight"
    };

}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window, GoogleMapFeature, GoogleMapElement*/

(function ($) {

    /* Jednotlivá nastavení stylu mapy (položka v GoogleMapStyle).
     *
     * style (GoogleMapStyle) - objekt se styly, ke kterému nastavení patří
     */

    var GoogleMapStyleOption = window.GoogleMapStyleOption = function GoogleMapStyleOption(style) {
        this.style = style;
        this.featureType = GoogleMapFeature.all;
        this.elementType = GoogleMapElement.all;
        this.stylers = [];
    };

    /* Zjistí, jestli nastavení odpovídá dané vlastnosti a elementu
     *
     * feature (String, Object) - název/objekt vlastnosti
     * elementu (String, Object) - název/objekt elementu
     * */
    GoogleMapStyleOption.prototype.is = function (feature, element) {

        return this.featureType === feature.toString() && this.elementType === element.toString();
    };

    /* Zjistí, jestli nastavení odpovídá dané vlastnosti
     *
     * feature (String, Object) - název/objekt vlastnosti
     * subTypes? (Boolean) - vrátit true i v případě, že se jedná o podtyp valstnosti
     * */
    GoogleMapStyleOption.prototype.isFeature = function (feature, subTypes) {

        if (!subTypes) {

            return this.featureType === feature.toString();
        }

        return !!this.featureType.match(new RegExp("^" + feature + "$|^" + feature + "\\."));
    };

    /* Zjistí, jestli nastavení odpovídá danému elementu
     *
     * element (String, Object) - název/objekt elementu
     * subTypes? (Boolean) - vrátit true i v případě, že se jedná o podtyp elementu
     * */
    GoogleMapStyleOption.prototype.isElement = function (element, subTypes) {

        if (!subTypes) {

            return this.elementType === element.toString();
        }

        return !!this.elementType.match(new RegExp("^" + element + "$|^" + element + "\\."));
    };

    /* Nastaví styler pro toto nastavení.
     *
     * typeOrStylers (String, Object) - String: název styleru, Objekt: { nazev: hodnota, nazev: hodnota }
     * value? - hodnota styleru
     * */
    GoogleMapStyleOption.prototype.set = function (typeOrStylers, value) {

        if (typeof typeOrStylers === "string" || (typeof typeOrStylers === "object" && typeOrStylers !== null)) {

            if (typeOrStylers instanceof Array) {

                typeOrStylers.forEach(function (styler) {
                    this.set(styler);
                }, this);

                return this;
            }

            if (typeof typeOrStylers === "object") {

                for (var type in typeOrStylers) {

                    if (typeOrStylers.hasOwnProperty(type)) {

                        this.set(type, typeOrStylers[type]);
                    }
                }

                return this;
            }

            var exists = this.stylers.some(function (styler) {

                if (Object.keys(styler)[0] === typeOrStylers) {

                    styler[Object.keys(styler)[0]] = value;

                    return true;
                }
            });

            if (!exists) {

                var styler = {};

                styler[typeOrStylers] = value;

                this.stylers.push(styler);
            }

            this.style.reset();
        }

        return this;
    };

    /* Odstraní styler pro toto nastavení.
     *
     * styler? (String, Array) - název nebo pole názvů stylerů, není-li zadáno
     *     celé nastavení se odstraní ze stylů
     */
    GoogleMapStyleOption.prototype.remove = function (styler) {

        if (typeof styler === "string" || (typeof styler === "object" && styler !== null)) {

            if (styler instanceof Array) {

                styler.forEach(function (styler) {
                    this.remove(styler);
                }, this);

                return this;
            }

            for (var s = this.stylers.length - 1; s >= 0; s--) {

                if (Object.keys(this.stylers[s])[0] === styler) {

                    this.stylers.splice(s, 1);
                }
            }

            this.style.reset();

        } else {

            this.style.remove(this);
        }

        return this;
    };
}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window, setTimeout, clearTimeout, GoogleMapStyler, GoogleMapFeature, GoogleMapElement, GoogleMapStyleOption*/

(function ($) {

    var FEATURE_ORDER = Object.keys(GoogleMapFeature).map(function (key) {
        return GoogleMapFeature[key].toString();
    });

    var ELEMENT_ORDER = Object.keys(GoogleMapElement).map(function (key) {
        return GoogleMapElement[key].toString();
    });

    /**
     * Třída obsahující styly pro mapu. Obsahuje API pro upravování stylu.
     * (Rozšiřuje Array)
     */
    var GoogleMapStyle = window.GoogleMapStyle = function GoogleMapStyle() {
        this.length = 0;
    };

    GoogleMapStyle.prototype = Object.create(Array.prototype);

    /* Vloži již hotový seznam stylů.
     *
     * styles (Array): styly [{ featureType: String, elementType: String, stylers: Array }, ...]
     */
    GoogleMapStyle.prototype.use = function (styles) {

        styles.forEach(function (style) {
            this.add(style.featureType, style.elementType, style.stylers);
        }, this);

        return this.reset();
    };

    /* Nastaví vlastnost pro aktuální (poslední) nastavení.
     *
     * type (String, Object) - název (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.feature = function (type) {

        if (typeof type === "string" || (typeof type === "object" && type !== null)) {

            if (!this.length) {

                this.add();
            }

            this[this.length - 1].featureType = type.toString();
        }

        return this.reset();
    };

    /* Nastaví elementu pro aktuální (poslední) nastavení.
     *
     * type (String, Object) - název (viz GoogleMapElement)
     */
    GoogleMapStyle.prototype.element = function (type) {

        if (typeof type === "string" || (typeof type === "object" && type !== null)) {

            if (!this.length) {

                this.add();
            }

            this[this.length - 1].elementType = type.toString();
        }

        return this.reset();
    };

    /* Nastaví styler pro aktuální (poslední) nastavení.
     *
     * type (String, Object) - název (viz GoogleMapStyler),
     * value - hodnota (viz GoogleMapStyler),
     */
    GoogleMapStyle.prototype.styler = function (type, value) {

        if (typeof type === "string" || (typeof type === "object" && type !== null)) {

            if (!this.length) {

                this.add();
            }

            this[this.length - 1].set(type, value);
        }

        return this.reset();
    };

    /* Nastaví vlastnost, elementu a/nebo styler pro aktuální (poslední) nastavení.
     *
     * feature? (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * element? (String, Object) - název elementu (viz GoogleMapElement)
     * stylers? (Object) - objekt se stylery (viz GoiogleMapStyler): { color: "#ffff00", weight: 0.5 }
     */
    GoogleMapStyle.prototype.set = function (feature, element, stylers) {

        this.feature(feature);
        this.element(element);
        this.styler(stylers);

        return this.reset();
    };

    /* Přidá další nastavení a nastaví pro něj vlastnost, element a/nebo styler.
     *
     * feature? (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * element? (String, Object) - název elementu (viz GoogleMapElement)
     * stylers? (Object) - objekt se stylery (viz GoiogleMapStyler): { color: "#ffff00", weight: 0.5 }
     */
    GoogleMapStyle.prototype.add = function (feature, element, stylers) {

        this[this.length++] = new GoogleMapStyleOption(this);

        this.set(feature, element, stylers);

        return this;
    };

    /* Odstraní nastavení podle zadanách hodnot
     *
     * indexOrOptionOrFeature (Number, String, Object, GoogleMapStyleOption, Array) - index, nastavení nebo název vlastnosti,
     *     případně pole těchto hodnot
     * element? (String, Object) - název elementu
     * subTypes (Boolean) - odstranit i podtypy?
     */
    GoogleMapStyle.prototype.remove = function (indexOrOptionOrFeature, element, subTypes) {

        if (indexOrOptionOrFeature instanceof Array) {

            indexOrOptionOrFeature.forEach(function (option) {
                this.remove(option);
            }, this);

            return this;
        }

        if (indexOrOptionOrFeature instanceof GoogleMapStyleOption) {

            for (var o = this.length - 1; o >= 0; o--) {

                if (indexOrOptionOrFeature === this[o]) {

                    this.splice(o, 1);
                }
            }

            return this.reset();
        }

        if (typeof indexOrOptionOrFeature === "number") {

            this.splice(indexOrOptionOrFeature, 1);

            return this.reset();
        }

        if (typeof indexOrOptionOrFeature === "string" || (typeof indexOrOptionOrFeature === "object" && indexOrOptionOrFeature !== null)) {

            var options = this.get(indexOrOptionOrFeature, element, subTypes);

            options.forEach(function (option) {
                this.remove(option);
            }, this);
        }

        return this;
    };

    /* Najde nastavení podle zadaných hodnot a vráti je v poli.
     *
     * feature? (String, Object) - název vlastnosti
     * element? (String, Object) - název elementu
     * subTypes? (Boolean) - vyhledávat i podtypy?
     */
    GoogleMapStyle.prototype.get = function (feature, element, subTypes) {

        if (feature && !element) {

            return this.filter(function (option) {
                return option.isFeature(feature, subTypes);
            });
        }

        if (element && !feature) {

            return this.filter(function (option) {
                return option.isElement(element, subTypes);
            });
        }

        return this.filter(function (option) {

            if (subTypes) {

                return option.isFeature(feature, true) && option.isElement(element, true);
            }

            return option.is(feature, element);
        });
    };

    /* Nastaví styler pro existující nastavení podle feature a element nebo vytvoří nové nastavení.
     *
     * feature? (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * element? (String, Object) - název elementu (viz GoogleMapElement)
     * stylers? (Object) - objekt se stylery (viz GoiogleMapStyler): { color: "#ffff00", weight: 0.5 }
     */
    GoogleMapStyle.prototype.rewriteOrAdd = function (feature, element, stylers) {

        var found = false;

        this.forEach(function (option, s) {

            if (option.is(feature, element)) {

                this[s].set(stylers);

                found = true;
            }
        }, this);

        if (!found) {

            this.add((feature && feature.toString()) || GoogleMapFeature.all, element, stylers);
        }

        return this.reset();
    };

    /* Seřadí nastavení, aby zanořená následovala po rodičovských.
     *
     * Např: roads.arterial, roads, roads.local => roads, roads.arterial, roads.local
     */
    GoogleMapStyle.prototype.sort = function () {

        if (arguments.length) {

            Array.prototype.sort.apply(this, arguments);

            return this.reset();
        }

        this.sort(function(a, b) {
            return FEATURE_ORDER.indexOf(a.featureType) - FEATURE_ORDER.indexOf(b.featureType) ||
                ELEMENT_ORDER.indexOf(a.elementType) - ELEMENT_ORDER.indexOf(b.elementType);
        });

        return this.reset();
    };

    /* Přepíše nastavení stylů v mapě (zobrazí změněná nastavení) - používá debouncing.
     */
    GoogleMapStyle.prototype.reset = function () {

        this.cancelReset();

        this.resetTimeout = setTimeout(function() {

            if (this.googleMap && this.googleMap.map) {

                this.googleMap.map.setOptions({
                    styles: this
                });
            }

        }.bind(this), 0);

        return this;
    };

    /* Zruši debouncing z metory reset.
     */
    GoogleMapStyle.prototype.cancelReset = function () {

        clearTimeout(this.resetTimeout);

        return this;
    };

    /* Skryje zadanout vlastnost.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hide = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.all, styler);
    };

    /* Skryje text zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideText = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.text, styler);
    };

    /* Skryje výplň textu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideTextFill = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.text.fill, styler);
    };

    /* Skryje čáru textu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideTextStroke = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.text.stroke, styler);
    };

    /* Skryje ikonu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideIcon = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.icon, styler);
    };

    /* Skryje popisek zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideLabels = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.labels, styler);
    };

    /* Skryje geometrii zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideGeometry = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry, styler);
    };

    /* Skryje výplň zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideFill = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry.fill, styler);
    };

    /* Skryje čáru textu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideStroke = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry.stroke, styler);
    };

    /* Zobrazí zadanou vlastnost a případně nastaví barvu a světlost (lightness).
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     */
    GoogleMapStyle.prototype.show = function (feature, color, lightness) {

        var styler = this.getFillStyler(color, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.all, styler);
    };

    /* Zobrazí text zadané vlastnosti a případně nastaví barvu a světlost (lightness).
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     */
    GoogleMapStyle.prototype.text = function (feature, color, lightness) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.on);

        if (color) {
            styler[GoogleMapStyler.color] = color;
        }

        if (lightness) {
            styler[GoogleMapStyler.lightness] = lightness;
        }

        return this.rewriteOrAdd(feature, GoogleMapElement.text, styler);
    };

    /* Zobrazí výplň textu zadané vlastnosti a případně nastaví barvu a světlost (lightness).
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     */
    GoogleMapStyle.prototype.textFill = function (feature, color, lightness) {

        var styler = this.getFillStyler(color, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.text.fill, styler);
    };

    /* Zobrazí čáru textu zadané vlastnosti a případně nastaví barvu, světlost (lightness) a sílu.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     * weight? (Number) - síla čáry (styler weight)
     */
    GoogleMapStyle.prototype.textStroke = function (feature, color, lightness, weight) {

        var styler = this.getStrokeStyler(color, weight, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.text.stroke, styler);
    };

    /* Zobrazí ikonu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.icon = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.on);

        return this.rewriteOrAdd(feature, GoogleMapElement.icon, styler);
    };

    /* Zobrazí popisek zadané vlastnosti a případně nastaví barvu, světlost (lightness) a sílu čáry.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     * weight? (Number) - síla čáry (styler weight)
     */
    GoogleMapStyle.prototype.labels = function (feature, color, lightness, weight) {

        var styler = this.getStrokeStyler(color, weight, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.labels, styler);
    };

    /* Zobrazí geometrii zadané vlastnosti a případně nastaví barvu, světlost (lightness) a sílu čáry.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     * weight? (Number) - síla čáry (styler weight)
     */
    GoogleMapStyle.prototype.geometry = function (feature, color, lightness, weight) {

        var styler = this.getStrokeStyler(color, weight, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry, styler);
    };

    /* Zobrazí výplň zadané vlastnosti a případně nastaví barvu a světlost (lightness).
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     */
    GoogleMapStyle.prototype.fill = function (feature, color, lightness) {

        var styler = this.getFillStyler(color, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry.fill, styler);
    };

    /* Zobrazí čáru zadané vlastnosti a případně nastaví barvu, světlost (lightness) a sílu.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     * weight? (Number) - síla čáry (styler weight)
     */
    GoogleMapStyle.prototype.stroke = function (feature, color, lightness, weight) {

        var styler = this.getStrokeStyler(color, weight, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry.stroke, styler);
    };


    /* Pro interní účely. Vrátí styler visibility.
     *
     * state - hodnota styleru visibility
     */
    GoogleMapStyle.prototype.getVisibilityStyler = function (state) {

        var styler = {};
        styler[GoogleMapStyler.visibility] = state.toString();

        return styler;
    };

    /* Pro interní účely. Vrátí stylery pro výplň.
     *
     * color (String) - hodnota styleru color
     * lightness (Nubmer) - hodnota styleru lightness
     * excludeVisibility (Boolean) - nepřidávat styler visibility
     */
    GoogleMapStyle.prototype.getFillStyler = function (color, lightness, excludeVisibility) {

        var styler = excludeVisibility ? {} : this.getVisibilityStyler(GoogleMapStyler.visibility.on);

        if (typeof color === "string") {
            styler[GoogleMapStyler.color] = color;
        }

        if (typeof lightness === "number" || typeof lightness === "string") {
            styler[GoogleMapStyler.lightness] = lightness;
        }

        return styler;
    };

    /* Pro interní účely. Vrátí stylery pro čáru.
     *
     * color (String) - hodnota styleru color
     * weight (Nubmer) - hodnota styleru weight
     * lightness (Nubmer) - hodnota styleru lightness
     * excludeVisibility (Boolean) - nepřidávat styler visibility
     */
    GoogleMapStyle.prototype.getStrokeStyler = function (color, weight, lightness, excludeVisibility) {

        var styler = this.getFillStyler(color, lightness, excludeVisibility);

        if (typeof weight === "number" || typeof weight === "string") {
            styler[GoogleMapStyler.weight] = weight;
        }

        return styler;
    };

}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMapStyle*/

function GoogleMapDarkStyle() {

    this.use([
        {
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#212121"
                }
            ]
        },
        {
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "color": "#212121"
                }
            ]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "featureType": "administrative.country",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#9e9e9e"
                }
            ]
        },
        {
            "featureType": "administrative.land_parcel",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#bdbdbd"
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#181818"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#616161"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "color": "#1b1b1b"
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "color": "#2c2c2c"
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#8a8a8a"
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#373737"
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#3c3c3c"
                }
            ]
        },
        {
            "featureType": "road.highway.controlled_access",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#4e4e4e"
                }
            ]
        },
        {
            "featureType": "road.local",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#616161"
                }
            ]
        },
        {
            "featureType": "transit",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#000000"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#3d3d3d"
                }
            ]
        }
    ]);
}

GoogleMapDarkStyle.prototype = Object.create(GoogleMapStyle.prototype);
GoogleMapDarkStyle.prototype.constructor = GoogleMapDarkStyle;
/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMapStyle*/

function GoogleMapDesaturatedStyle() {

    this.use([
        {
            featureType: "all",
            stylers: [
                {
                    saturation: -100
                }
            ]
        }
    ]);
}

GoogleMapDesaturatedStyle.prototype = Object.create(GoogleMapStyle.prototype);
GoogleMapDesaturatedStyle.prototype.constructor = GoogleMapDesaturatedStyle;
/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMapStyle*/

function GoogleMapMonochromeStyle(color, contrast) {

    this.use(GoogleMapMonochromeStyle.INITIAL_STYLES);

    this.color(color);
    this.contrast(contrast);
}

GoogleMapMonochromeStyle.INITIAL_STYLES = [
    {
        "featureType": "all",
        "elementType": "all",
        "stylers": [
            {
                "color": "#7f7f7f"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "lightness": 0
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "lightness": 90
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "lightness": 70
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "lightness": 85
            },
            {
                "weight": 1.2
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 80
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 70
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "lightness": 60
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "lightness": 95
            },
            {
                "weight": 0.75
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 93
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 93
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 93
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 90
            }
        ]
    }
];

GoogleMapMonochromeStyle.prototype = Object.create(GoogleMapStyle.prototype);
GoogleMapMonochromeStyle.prototype.constructor = GoogleMapMonochromeStyle;

GoogleMapMonochromeStyle.prototype.color = function (color) {

    if (typeof color === "string") {

        this.rewriteOrAdd("all", "all", {
            color: color
        });
    }

    return this.reset();
};

GoogleMapMonochromeStyle.prototype.contrast = function (contrast) {

    if (typeof contrast === "number") {

        this.constructor.INITIAL_STYLES.forEach(function (option) {

            option.stylers.forEach(function (styler) {

                if (styler.lightness) {

                   this.rewriteOrAdd(option.featureType, option.elementType, {
                       lightness: styler.lightness * contrast
                   });
                }
            }, this);
        }, this);
    }

    return this.reset();
};
/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMapMonochromeStyle*/

function GoogleMapMonochromeStyleDark(color, contrast) {

    this.use(GoogleMapMonochromeStyleDark.INITIAL_STYLES);

    this.color(color);
    this.contrast(contrast);
}

GoogleMapMonochromeStyleDark.INITIAL_STYLES = [
    {
        "featureType": "all",
        "elementType": "all",
        "stylers": [
            {
                "color": "#7f7f7f"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "lightness": 0
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "lightness": -90
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "lightness": -76
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "lightness": -82
            },
            {
                "weight": 1.2
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": -80
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": -72
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "lightness": -80
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "lightness": -60
            },
            {
                "weight": 0.75
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": -92
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": -92
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": -92
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": -88
            }
        ]
    }
];

GoogleMapMonochromeStyleDark.prototype = Object.create(GoogleMapMonochromeStyle.prototype);
GoogleMapMonochromeStyle.prototype.constructor = GoogleMapMonochromeStyleDark;
