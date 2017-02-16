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
     *     markers: [{icon: "marker.png", coords: [], info: "", options: {}, id: "" | 0}], - více vlastních pinů
     *     addMarker: false, - jestli přidávat marker, pokud není nastaveno icon
     *     html: "" | HTMLElement | {html: "" | HTMLElement, coords: [] | Marker | LatLng, draw: function} | [...] - html obsah na mapě
     *     zoom: 14, - přiblížení mapy
     *     styles: [] | GoogleMapStyle, - styl mapy
     *     info: "", - informace zobrazující se u výchozího markeru
     *     options: {}, - nastavení přidávající k mapě další nastavení
     *     controls: false, - ne/zobrazovat všechny ovládací prvky (lze přepsat v options)
     *     centerLocationOnResize: 100 | true - vycentrovat mapu na coords při změně velikosti okna | číslo nastavuje, za jak dlouho po události resize považovat změnu velikosti za ukončenou
     * }
     * */
    var DEFAUlTS = { /*Výchozí nastavení je možné změnit v GoogleMap.DEFAULTS.*/
            el: "#map",

            zoom: 14,
            controls: false,
            styles: [],
            centerLocationOnResize: 100
        },

        GoogleMap = window.GoogleMap = function GoogleMap(options) {

            if (typeof options !== "object") {

                throw "Options required.";
            }

            this.options = $.extend({}, DEFAUlTS, options);

            if (!this.options.coords) {

                throw "Coords are required.";
            }

            if (!this.options.el) {

                this.options.el = GoogleMap.DEFAULTS.el;
            }

            if (!this.options.zoom) {

                this.options.zoom = GoogleMap.DEFAULTS.zoom;
            }

            if (!this.options.styles) {

                this.options.styles = GoogleMap.DEFAULTS.styles;
            }

            this.el = null;
            this.$el = null;
            this.map = null;

            this._animations = {};
            this._$animEl = $("<div></div>");

            this._idHTMLCounter = 0;
            this._idMarkerCounter = 0;
            this._idInfoCounter = 0;

            this._markers = [];
            this._infos = [];
            this._htmls = [];

            this.markers = {};
            this.infos = {};
            this.HTMLs = {};

            this.markerId = null;
            this.infoId = null;
            this.HTMLId = null;

            GoogleMaps.addMap(this);
        },

        generateId = function (type) {

            switch (type) {

                case "HTML"  : return !this.HTMLs[++this._idHTMLCounter]     ? this._idHTMLCounter   : generateId.call(this, type);
                case "Marker": return !this.markers[++this._idMarkerCounter] ? this._idMarkerCounter : generateId.call(this, type);
                case "Info"  : return !this.infos[++this._idInfoCounter]     ? this._idInfoCounter   : generateId.call(this, type);
            }
        },

        initInfoEvents = function (info, marker) {

            var touch = false;

            google.maps.event.addListener(marker, "touchend", function() {

                touch = true;

                info.open(this.map, this);
            });

            google.maps.event.addListener(marker, "click", function() {

                if (touch) {

                    touch = false;

                    return;
                }

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

        this.$el = this.options.el.jquery ? this.options.el : $(this.options.el);
        this.el = this.$el[0];

        var mapOptions = {
            zoom: this.options.zoom
        };

        if (this.options.coords instanceof google.maps.LatLng) {

            mapOptions.location = this.options.coords;

        } else {

            mapOptions.location = new google.maps.LatLng(this.options.coords[0], this.options.coords[1]);
        }

        if (this.options.styles instanceof GoogleMapStyle) {

            mapOptions.styles = this.options.styles.getStyles();

        } else {

            mapOptions.styles = this.options.styles;
        }

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

        if (this.options.centerLocationOnResize) {

            this.initCenterLocationOnResize(this.options.centerLocationOnResize);
        }

        this.initialized = true;

        if (this.options.markers) {

            this.options.markers.forEach(this.addMarker.bind(this));

        } else if (this.options.icon || this.options.addMarker) {

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

        if (typeof this.options.onInit === "function") {

            this.options.onInit.call(this);
        }
    };

    /**
     * Přidá k mapě marker. Pokud je mapa inicializovaná vrátí instanci Markeru.
     * Všechny markery jsou v instance.markers.
     *
     * options - {
     *     coords: [1, 1] | LatLng, - souřadnice markeru
     *     icon: "marker.png", - ikona markeru
     *     options: {}, - ostatní nastavení markeru
     *     info: "" - informace zobrazované u markeru
     *     id: id Markeru, podle kterého je možné najít příslušný objekt
     *     infoId: id Infa, podle kterého je možné najít příslušný objekt
     * }
     * returnInstance (Boolean) - vrátit místo id instanci
     */
    GoogleMap.prototype.addMarker = function (options, returnInstance) {

        options = options || {};

        var id = options.id || generateId.call(this, "Marker");

        if (!this.initialized) {

            options.id = options.id || id;

            this._markers.push(options);

            return returnInstance ? null : id;
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

        return returnInstance ? marker : id;
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
     * Přidá informace k markeru. Pokud je mapa inicializovaná vrátí instanci InfoWindow.
     * Info se zobrazuje při kliknutí (a touchend) na pin. Všechny info jsou v instance.infos.
     *
     * options - {
     *     content: "", - obsah
     *     options: {}, - další nastavení
     *     marker: Marker - marker, ke kterému se má info přiřadit (pokud není nastaveno použije se poslední)
     *     id: id Infa, podle kterého je možné najít příslušný objekt
     * }
     * returnInstance (Boolean) - vrátit místo id instanci
     */
    GoogleMap.prototype.addInfo = function (options, returnInstance) {

        options = options || {};

        var id = options.id || generateId.call(this, "Info");

        if (!this.initialized) {

            options.id = options.id || id;

            this._infos.push(options);

            return returnInstance ? null : id;
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

        return returnInstance ? info : id;
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
     * Přidá do mapy vlastní HTML obsah. Pokud je mapa inicializovaná vrátí instanci GoogleMapHTMLOverlay.
     * Všechny HTML jsou v instance.HTMLs.
     *
     * options - "<div></div>" | {
     *     html: "" | HTMLElement, - vlastní HTML obsah
     *     coords: [1, 1] | LatLng | Marker, - souřadnice, kam vložit HTML (pokud není nastaveno, použije se location mapy)
     *     draw: function, - vlastní funkce zajišťující vykreslení HTML
     *     id: id HTML, podle kterého je možné najít příslušný objekt
     * }
     * returnInstance (Boolean) - vrátit místo id instanci
     */
    GoogleMap.prototype.addHTML = function (options, returnInstance) {

        options = options || {};

        var id = options.id || generateId.call(this, "HTML");

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

            return returnInstance ? null : id;
        }

        var html = typeof options === "string" || options instanceof HTMLElement ? options : options.html,
            position = typeof options === "object" && !(options instanceof HTMLElement) ? options.coords : null,
            draw = typeof options === "object" && !(options instanceof HTMLElement) ? options.draw : null,

            overlay = new GoogleMapHTMLOverlay(this.map, html, position, draw);

        this.HTMLs[id] = overlay;

        return returnInstance ? overlay : id;
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
     * Varátí styl podle jména. Pokud styl neexistuje, vrátí styl "empty".
     * Vrací instanci GoogleMapStyle.
     *
     * name (String) - název stylu
     * modifier (Function) - funkce pro úpravu stylu
     */
    GoogleMap.getStyles = function (name, modifier) {

        var style;

        if (!GoogleMap.STYLES[name]) {

            style = new GoogleMapStyle(GoogleMap.STYLES.empty());

        } else {

            style = new GoogleMapStyle(GoogleMap.STYLES[name]());
        }

        if (typeof modifier === "function") {

            modifier.call(style);
        }

        return style;
    };

    /**
     * Při změně velikosti okna zarovná mapu na střed location.
     *
     * ms (Number) - debouncing
     */
    GoogleMap.prototype.initCenterLocationOnResize = function (ms) {

        if (this.resizeInitialized) {

            return;
        }

        var debounce = typeof ms === "number",

            _this = this;

        google.maps.event.addDomListener(window, "resize", function () {

            if (debounce) {

                clearTimeout(debounce);

                debounce = setTimeout(_this.centerLocation.bind(_this), ms);

                return;
            }

            _this.centerLocation();
        });

        this.resizeInitialized = true;
    };

    /**
     * Zarovná mapu na střed location.
     */
    GoogleMap.prototype.centerToLocation = function () {

        this.map.setCenter(this.map.location);
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
     * Zvýrazní zadaný marker.
     *
     * markerToHightlight (String, Marker) - id Markeru nebo Marker
     * opacity (Number) - jakou opacity mají mít ostatní markery
     * duration (Number) - délka animace
     * easing (String) - easing
    */
    GoogleMap.prototype.highlight = function (markerToHightlight, opacity, duration, easing) {

        if (typeof markerToHightlight === "string" || typeof markerToHightlight === "number") {

            markerToHightlight = this.getMarker(markerToHightlight);
        }

        if (duration) {

            var initOpacity = [];

            this._$animEl.stop().animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.markers, function (m, marker) {

                        if (typeof initOpacity[m] !== "number") {

                            initOpacity[m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : 1;
                        }

                        var targetOpacity = marker !== markerToHightlight ? opacity : 1,

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

                marker.setOpacity(marker === markerToHightlight ? 1 : opacity);

            } else {

                marker.setVisible(marker === markerToHightlight);
            }
        });
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

}(jQuery));
