<template>
  <div>
    <v-snackbar
      v-model="snackbar"
      :timeout="10000"
    >
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
import { bus } from '@/main'
export default {
  name: 'SnackBar',
  data: () => ({
    snackbarText: '',
    snackbar: false
  }),    
  created () {
    bus.$on('snackbar', async (message) => {
      console.log('Snackbar message: ', message)
      this.snackbarText = message
      this.snackbar = true
    })
  },  
}
</script>