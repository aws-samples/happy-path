<template>
  <v-app>
    <!-- // App bar -->
    <v-app-bar app color="green" dark>
      <!-- Logo -->
      <div class="d-flex align-center">
        <v-img
          alt="Happy Path"
          class="shrink mr-2"
          contain
          src="./assets/logo.png"
          transition="scale-transition"
          width="140" 
          style="top: 20px; left: -20px;"
          display=: block
        />
      </div>

      <v-spacer></v-spacer>

      <!-- Check that the SDK client is not currently loading before accessing is methods -->
      <div v-if="!$auth.loading">
        <!-- show login when not authenticated -->
        <v-btn text v-if="!$auth.isAuthenticated" @click="login">
          <span class="mr-2">Log in</span>
          <v-icon>mdi-account-circle</v-icon>
        </v-btn>
        <!-- show logout when authenticated -->
        <v-btn text v-if="$auth.isAuthenticated" @click="logout">
          <span class="mr-2">Log out</span>
          <v-icon>mdi-account-arrow-right</v-icon>
        </v-btn>
      </div>

    </v-app-bar>

    <!-- Main content -->
    <v-main>
      <v-container class="pa-0 ma-0">
        <!-- Inject view from current path here -->
        <router-view v-if="authReady"></router-view>
      </v-container>
    </v-main>
    <iot/>
    <snackbar/>
    
  </v-app>
</template>

<script>
import { bus } from '@/main'
import Snackbar from '@/components/Snackbar'

export default {
  name: 'App',
  components: {
    'snackbar': Snackbar,
  },
  data: function () {
    return {
      authReady: false
    }
  },
  created () {
    bus.$on('loaded', async () => {
      console.log('Auth loaded')
      this.$store.commit('setInitialized', true)      
      this.authReady = true
    })
  },
  methods: {
    // Log the user in
    login() {
      this.$auth.loginWithRedirect();
    },
    // Log the user out
    logout() {
      this.$auth.logout({
        returnTo: window.location.origin
      })
    }
  }  
}
</script>
