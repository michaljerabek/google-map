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
