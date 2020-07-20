/*
  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
  Permission is hereby granted, free of charge, to any person obtaining a copy of this
  software and associated documentation files (the "Software"), to deal in the Software
  without restriction, including without limitation the rights to use, copy, modify,
  merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
  PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

'use strict'

import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

// initial state
const state = {
  initialized: false,
  position: {
    latitude: '-70.8238872',
    longitude: '43.0385959'
  },
  user: {},
  places: {}
}

// getters
const getters = {
  isInitialized: (state) => state.initialized,
  getPosition: (state) => state.position,
  getUser: (state) => state.user,
  places: (state) => state.places,
}

//mutations
const mutations = {
  setPosition(state, position) {
    state.position.latitude = position.coords.latitude
    state.position.longitude = position.coords.longitude;  
  },
  savePlace(state, data) {
    console.log('store::savePlace:', data)

    // Add main listing info
    let listing = data.find (el => el.SK === 'listing')
    console.log('Store adding listing: ', listing)
    state.places[listing.PK] = {}
    state.places[listing.PK].listing = listing

    // Add assets
    let assets = data.filter (el => el.SK !== 'listing')
    state.places[listing.PK].assets = assets

    console.log('Store places: ', state.places)
  },
  saveAsset(state, data) {
    console.log('store::saveAsset: ', data)
    const asset = {
      PK: data.asset.PK.S,
      SK: data.asset.SK.S,
      created: data.asset.created.N,
      scaledURL: data.asset.scaledURL.S,
      tileURL: data.asset.tileURL.S,
      type: data.asset.type.S
    }
    console.log('Adding: ', asset)
    state.places[data.placeId].assets.push(asset)
  },
  setUser(state, user) {
    state.user = user
  },
  setInitialized(state, val) {
    console.log('setInitalized')
    state.initialized = val
  }
}

export default new Vuex.Store({
  // strict: true,
  state,
  getters,
  mutations
})
