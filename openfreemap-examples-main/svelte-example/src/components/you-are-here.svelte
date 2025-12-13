<script lang="ts">
  import { mapContext } from "svelte-maplibre";
  import { getLocation } from "../lib/api";
  import { Popup } from "maplibre-gl";

  const { map } = mapContext();
  let popupCreated = false;

  $: if ($map && !popupCreated) {
    (async () => {
      popupCreated = true;
      const location = await getLocation();
      $map.flyTo({ center: location, zoom: 8 });
      // programmatically creating...
      // could not get Popup component to display inner children
      new Popup({
        closeOnClick: false,
      })
        .setLngLat(location)
        .setHTML("<h3>You are approximately here!</h3>")
        .addTo($map);
    })();
  }
</script>
