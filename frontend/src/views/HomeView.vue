<template>
  <v-container id="HomeView" class="pa-0 ma-0">

    <!-- Questions list for authenticated users -->
    <v-container class="pa-0 ma-0">
      <GmapMap
        ref="mapRef"
        :center="{lat:this.currentLat, lng:this.currentLng}"
        map-type-id="terrain"
        style="width: 100%; min-height: 94vh;"
        :options="{
          zoomControl: false,
          zoom,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          disableDefaultUI: false
        }"
      > 
        <GmapMarker
          :options="options"
          :key="index"
          v-for="(m, index) in locations"        
          :position="m.position"
          :icon="m.icon"
          :clickable="true"
          :draggable="false"
          :animation="google.maps.Animation.DROP"
          @click="showDetails(m)"          
        />
 
        <GmapCircle
          :center="{lat: currentLat, lng: currentLng}"
          :radius="8000"
          :options="{
            fillColor:'green',
            fillOpacity:0.1,
            strokeColor: '#0000FF',
            strokeOpacity: 0.2,
            strokeWeight: 0
          }"
        />
        <!-- Popup info when a pin is clicked -->
        <GmapInfoWindow
            :options="options"
            :position="infoWindow.position"
            :opened="infoWindow.open"
            @closeclick="infoWindow.open=false">
            <v-card min-width=400 class="ma-2">
              <v-card-title class="h2">{{ infoWindow.title }}</v-card-title>
              <div v-if="infoWindow.loading===false">
                <v-card-subtitle v-if="!infoWindow.UGC">We have no custom content for this location - be the first to contribute!</v-card-subtitle>

                <v-row v-if="infoWindow.UGC">
                  <v-col cols="12">
                      <v-container fluid>
                        <v-row class="ma-0">
                          <v-col
                            v-for="n in infoWindow.assets.length"
                            :key="n"
                            class="d-flex child-flex ma-0"
                            style="padding: 1px !important;"                      cols="6"
                          >
                            <v-card tile class="d-flex">
                              <v-img
                                :src="infoWindow.assets[n-1]"
                                aspect-ratio="1"
                                class="grey lighten-2"
                              >
                                <template v-slot:placeholder>
                                  <v-row
                                    class="fill-height ma-0"
                                    align="center"
                                    justify="center"
                                  >
                                    <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                                  </v-row>
                                </template>
                              </v-img>
                            </v-card>
                          </v-col>
                        </v-row>
                      </v-container>
                  </v-col>
                </v-row>

              </div>
              <v-spacer></v-spacer>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn v-if="infoWindow.loading===false"
                  color="primary"
                  class="mr-4"
                  large block
                  @click="loadDetailsPage">
                  Show details
                </v-btn>
                <v-btn 
                  v-if="infoWindow.loading===true"
                  color="primary"
                  large block loading disabled>
                  Loading
                </v-btn>
              </v-card-actions>              
            </v-card>
        </GmapInfoWindow>
      </GmapMap>     
    </v-container>
  </v-container>
</template>
<!-- eslint-disable -->
<script>
  import axios from "axios"
  import { bus } from '../main'
  import { gmapApi } from 'vue2-google-maps'

  export default {
    name: "HomeView",
    data: function () {   
      return {
        map: null,
        currentLat: 40.7358235,
        currentLng: -73.9927102,
        zoom: 12,
        loading: true,
        user: null,
        locations: [],
        currentPlaceId: null,
        infoWindow: {
          open: false,
          title: '',
          UGC: false,
          loading: true,
          assets: [],
          position: {
            lat: 40.7358235,
            lng: -73.9927102
          }
        },
        options: { 
          pixelOffset: 10 
        }
      }
    },
    computed: {
      places() {
        return this.$store.getters.places
      },
      google: gmapApi
    },
    mounted () {
      console.log('HomeView::mounted')
      let _this = this

      // Get reference to Map object
      this.$refs.mapRef.$mapPromise.then(async (map) => {
        _this.map = map

        // Floats the InfoWindow above the icon
        this.options.pixelOffset = new google.maps.Size(-3, -30)

        // Get the current location when starting the app
        navigator.geolocation.getCurrentPosition((position) => {
          console.log('Position returned: ', position)
          this.$store.commit('setPosition', position)
          this.currentLat = position.coords.latitude
          this.currentLng = position.coords.longitude
          _this.loading = false
          _this.updateResults()
        }, () => {
          console.log('Error: The Geolocation service failed.')
        }, {
          enableHighAccuracy: true,
          timeout: 30000
        })

        // Update new coords when map is moved by user
        map.addListener('idle', function() {
          if ((map.center.lat() != _this.currentLat) && (map.center.lng() != _this.currentLng)) {
            _this.currentLat = map.center.lat()
            _this.currentLng = map.center.lng()
            _this.zoom = map.zoom
            console.log('New center location: ', _this.currentLat, _this.currentLng)
            _this.updateResults()
          }
        })
      })
    },
    created () {
      bus.$on('authenticated', async (user) => {
        this.$store.commit('setUser', user)
        console.log('User signed in: ', this.$store.getters.getUser)
      })
    },
    methods: {
      updateResults() {
        if (this.loading) return
        let _this = this

        // Perform Google Places search for nearby places of interest
        // See https://developers.google.com/maps/documentation/javascript/examples/place-search-pagination 
        const service = new google.maps.places.PlacesService(this.map);

        // List of supported types: https://developers.google.com/places/web-service/supported_types
        service.nearbySearch(           
          { location: {lat: this.currentLat, lng: this.currentLng}, radius: 7500, type: this.$businessType},
          function(results, status, pagination) {
            console.log('service.nearbySearch results: ', status)
            if (status !== 'OK') return
            _this.createMarkers(results)
          })
      },
      // Render markers from map search service
      async createMarkers(places) {
        console.log('createMarkers: ', places)
        this.locations = []

        for (let i = 0, place; place = places[i]; i++) {
          const image = {
            url: place.icon,
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25)
          }          
          this.locations.push({
            place_id: place.place_id,
            type: this.$businessType,
            vicinity: place.vicinity,
            name: place.name,
            position: place.geometry.location,
            icon: image
          })
        }
        console.log('Locations: ', this.locations)
      },
      // When user clicks a map marker
      async showDetails(location) {
        console.log('showDetails : ', location.place_id)
        this.infoWindow.title = location.name
        this.infoWindow.position = location.position
        this.infoWindow.open = true
        this.currentPlaceId = location.place_id

        // Check if placeId is known/cached
        if (!this.places[location.place_id]) {

          this.infoWindow.loading = true
          this.infoWindow.UGC = false

          const { data } = await axios.get(`${this.$APIurl}/locations?placeId=${location.place_id}`)

          // Known in app database
          if (data.length > 0) {
            this.$store.commit('savePlace', data)
          } else {
            // Save to app database
            const item = await axios.post(`${this.$APIurl}/locations`, {
              place_id: location.place_id,
              name: location.name,
              type: location.type,
              vicinity: location.vicinity,
              lat: location.position.lat(),
              lng: location.position.lng()
            })
            console.log('Saved to database: ', item.data)

            // Add to local store
            let result = []
            result.push(item.data)
            this.$store.commit('savePlace', result)
          }
        } else {
          console.log('Found: ', this.places[location.place_id])
          this.places[location.place_id].assets.map((asset) => this.infoWindow.assets.push(asset.tileURL))
          console.log(this.infoWindow)
          this.infoWindow.UGC = true
        }
        this.infoWindow.loading = false
      },
      loadDetailsPage() {
        this.$router.push({ name: 'PlaceDetail', query: { placeId: this.currentPlaceId } })
      }
    }
  }
</script>
