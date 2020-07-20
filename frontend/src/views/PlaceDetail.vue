<template>
  <div class="home">
    <v-container>
      <v-card class="ma-2">
        <v-card-title class="headline">{{ name }}</v-card-title>
        <v-card-subtitle>{{ vicinity }}</v-card-subtitle>
      </v-card>

      <v-card class="ma-2" v-if="!$auth.isAuthenticated" >
        <v-list-item-content>
          <div class="body-1 ma-4">Please log in to upload images.</div>
        </v-list-item-content>
      </v-card>

      <v-btn
        v-if="$auth.isAuthenticated" 
        :disabled="image !== ''" 
        @click="$refs.file.click()" 
        large block 
        href="#" 
        color="primary"
        class="mr-4"
        type="file">
        Upload images
      </v-btn>
      <input id="file" accept="image/jpeg" type="file" ref="file" style="display: none" @change="onFileChange"/> 
    </v-container>

    <v-card class="ma-2">
      <v-img 
        v-for="asset in assets"
        v-bind:key="asset"
        :src="asset"
        aspect-ratio="1"
        class="grey lighten-2 mb-2"
        max-width="500"
        max-height="300"
      />
    </v-card>

    <!-- Back icon -->
    <v-container class="pa-0 ma-0">
      <v-btn 
        fixed
        dark
        fab
        bottom
        right
        color="gray"
        class="mb-4"
        to="/">
        <v-icon>arrow_back</v-icon>
      </v-btn>
    </v-container>   
  </div>
</template>
<!-- eslint-disable -->
<script>
import { bus } from '../main'
import axios from "axios"

export default {
  name: 'PlaceDetail',
  data: () => ({
    placeId: null,
    image: '',
    name: '',
    vicinity: '',
    assets: []
  }),  
  computed: {
    places() {
      return this.$store.getters.places
    }
  },  
  async mounted () {
    console.log('PlaceDetail::mounted')
    this.placeId = this.$route.query.placeId

    if (!this.places[this.placeId]) {
      console.log('Load it')
      const { data } = await axios.get(`${this.$APIurl}/locations?placeId=${this.placeId}`)
      if (data.length > 0) {
        this.$store.commit('savePlace', data)
      }
    } else {
      console.log('Found: ', this.places[this.placeId])
    }

    this.name = this.places[this.placeId].listing.name 
    this.vicinity = this.places[this.placeId].listing.vicinity

    this.places[this.placeId].assets.map((asset) => {
      this.assets.push(asset.scaledURL)
    })

    bus.$emit('subscribe', this.placeId)
    console.log('Assets: ', this.assets)
  },
  methods: {
    onFileChange (e) {
      let files = e.target.files || e.dataTransfer.files
      if (!files.length) return
      this.createImage(files[0])
    },
    createImage (file) {
      let reader = new FileReader()
      const MAX_IMAGE_SIZE = 20000000
      reader.onload = (e) => {
        console.log('length: ', e.target.result.includes('data:image/jpeg'))
        if (!e.target.result.includes('data:image/jpeg')) {
          return alert('This is not a supported file type.')
        }
        if (e.target.result.length > MAX_IMAGE_SIZE) {
          return alert('This image is too large.')
        }
        this.image = e.target.result
        this.uploadImage()
      }
      reader.readAsDataURL(file)
    },
    uploadImage: async function () {
      if (!this.placeId) return

      const token = await this.$auth.getTokenSilently()

      // Only use this line for debugging! It displays the JWT token in the browser console.
      console.log(token)

      // Get the presigned URL
      const url = `${this.$APIurl}/images?placeId=${this.placeId}`
      console.log('URL: ', url)
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
        }
      })

      console.log('Response: ', response.data)
      // console.log('Uploading: ', this.image)
      let binary = atob(this.image.split(',')[1])
      let array = []
      for (var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i))
      }
      let blobData = new Blob([new Uint8Array(array)], {type: 'image/jpeg'})
      console.log('Uploading to: ', response.data.uploadURL)

      const result = await fetch(response.data.uploadURL, {
        method: 'PUT',
        body: blobData
      })
      console.log('Result: ', result)
      // Final URL for the user doesn't need the query string params
      this.uploadURL = response.data.uploadURL.split('?')[0]
      this.image = ''
      // Alert user, navigate back to home
      bus.$emit('snackbar', 'Image successfully uploaded!')
      this.$router.push({path: '/'})
    }      
  }
}
</script>
