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
