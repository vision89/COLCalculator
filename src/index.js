require('file-loader?name=[name].[ext]!./index.html');

// Import the locations data
import locations from './data/locations.js';

/**
 * Return the nearest location to the parameter from list list of locations
 * @param {object} location 
 */
function getNearestLocation(location) {

    /**
     * Calculate the distance between locations
     * This is a slightly modified version of the distance algorithm
     * found here https://www.geodatasource.com/developers/javascript
     * @param {object} loc1 
     * @param {object} loc2 
     */
    function calculateDistance(loc1, loc2) {

        const radlat1 = Math.PI * loc1.lat / 180;
		const radlat2 = Math.PI * loc2.lat / 180;
		const theta = loc1.lng - loc2.lng;
		const radtheta = Math.PI * theta / 180;
		let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        
        if (dist > 1) {
			dist = 1;
		}
        
        dist = Math.acos(dist);
		dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        
        return dist

    }

    let nearestLocation = {
        location: locations[0],
        distance: calculateDistance(location, locations[0])
    };

    // Naive approach, calculates the distance between every
    // location, remembering the shortest
    for(let i = 1; i < locations.length; ++i) {

        const distance = calculateDistance(location, locations[i]);

        if(distance < nearestLocation.distance) {

            nearestLocation.location = locations[i];
            nearestLocation.distance = distance;

        }

    }

    return nearestLocation;

}

const app = new Vue({
el: '#app',
    data: {
        fromPlace: '',
        toPlace: '',
        yearlyIncome: '',
        loading: false,
        errorMessage: '',
        necessaryIncome: '',
        calculatedFromPlace: '',
        calculatedToPlace: ''
    },
    methods: {
        /**
         * Calculate and display the cost of living
         */
        calculateCOL: function() {
            
            // Income necessary to move from a to b and maintain the standard of living
            this.necessaryIncome = 0;
            let getLocationPromises = [];
            let toLocation = null;
            let fromLocation = null;

            /**
             * Gets a location from google
             * @param {string} name 
             */
            function getLocation(name) {

                return fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + 
                    name.replace(/[' ']+/g, '+') + '&key=AIzaSyDaN8hISTepz9iTx1qoUnNtaqNeexEaMH8')
                    .then(response => response.json());

            }

            // Show the spinner
            this.loading = true;

            // Get nearest from location
            getLocationPromises.push(getLocation(this.fromPlace).then(data => {

                if(data.results.length > 0) {

                    fromLocation = getNearestLocation(data.results[0].geometry.location);

                }

            }));

            // Get nearest to location
            getLocationPromises.push(getLocation(this.toPlace).then(data => {
                
                if(data.results.length > 0) {

                    toLocation = getNearestLocation(data.results[0].geometry.location);

                }

            }));

            // Resolve both location calls
            Promise.all(getLocationPromises).then(function() {

                // Make sure you could find them, this may not work
                // occasionally for a variety of reasons
                if(toLocation !== null && fromLocation !== null) {

                    this.necessaryIncome = parseInt(this.yearlyIncome);

                    // Calculate COL
                    let diff = (toLocation.location.value - fromLocation.location.value) / 100;

                    // We are simply calculating the value difference between both locations, using
                    // that as a percentage to either increase or decrease the income
                    if(diff > 0) {

                        this.necessaryIncome += this.necessaryIncome * diff;

                    } else if (diff < 0) {

                        this.necessaryIncome -= this.necessaryIncome * diff;

                    }

                    this.calculatedFromPlace = fromLocation.location.name;
                    this.calculatedToPlace= toLocation.location.name;

                } else {

                    // error
                    this.error = 'Sorry I could not calculate the cost of living.';

                }

                // Turn off the spinner
                this.loading = false;

            }.bind(this));

        }
    }
});