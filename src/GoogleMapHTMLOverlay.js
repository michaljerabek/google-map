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
    var GoogleMapHTMLOverlay = window.GoogleMapHTMLOverlay = function GoogleMapHTMLOverlay(map, html, position, drawFn) {

        this.html = html;

        this.$el = null;
        this.el = null;

        this.map = map;

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
    GoogleMaps.$EVENT.on("googleMapInit.GoogleMap", function () {

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
                .appendTo(panes.overlayLayer);

            this.el = this.$el[0];
        };

        /*
         * Povinná metoda pro vykreslení mapy.
         * Zarovná HTML doprostřed nad souřadnice.
         * */
        GoogleMapHTMLOverlay.prototype.draw = function() {

            var overlayProjection = this.getProjection(),

                position = overlayProjection.fromLatLngToDivPixel(this.position),
                size = {
                    width: this.el.offsetWidth,
                    height: this.el.offsetHeight
                };

            this.el.style.left = (position.x - (size.width / 2)) + "px";
            this.el.style.top = (position.y - size.height) + "px";
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
