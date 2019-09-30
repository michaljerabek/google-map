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
