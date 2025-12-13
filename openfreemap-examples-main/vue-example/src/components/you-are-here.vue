<script setup lang="ts">
import {
  useMap,
  MglPopup,
} from '@indoorequal/vue-maplibre-gl';
import { middleOfUSA } from '@/lib/constants';
import { ref, watchEffect } from 'vue';
import { getLocation } from '@/lib/api';

const coordinates = ref(middleOfUSA);
const mapRef = useMap();

watchEffect(async () => {
  if (!mapRef.isLoaded || !mapRef.map) return;

  const location = await getLocation();
  if (location !== middleOfUSA) {
    coordinates.value = location;
    mapRef.map.flyTo({ center: location, zoom: 8 });
  }
})
</script>
<template>
  <mgl-popup v-if="mapRef.isLoaded" :close-on-click="false" :coordinates="coordinates">
    <h3>You are approximately here!</h3>
  </mgl-popup>
</template>