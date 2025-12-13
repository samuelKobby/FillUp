<script lang="ts">
  import { MapLibre } from "svelte-maplibre";
  import { middleOfUSA } from "./lib/constants";
  import YouAreHere from "./components/you-are-here.svelte";
</script>

<!-- style="/styles/dark.json" -->
<!-- style="https://tiles.openfreemap.org/styles/liberty" -->
<MapLibre
  center={middleOfUSA}
  zoom={2}
  style="https://tiles.openfreemap.org/styles/liberty"
>
  <YouAreHere />
</MapLibre>
