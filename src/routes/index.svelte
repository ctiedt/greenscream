<script>
	import { main } from "../index.ts";
	import { onMount } from "svelte";

	onMount(() => {
		main();
	});
</script>

<svelte:head>
	<title>GreenScream</title>
</svelte:head>

<h1>GreenScream</h1>

<!-- svelte-ignore a11y-media-has-caption -->
<video autoplay id="webcam"><p>Couldn't get webcam access</p></video>
<img id="background" src="photo_2019-10-02_18-27-59.png" width="1280" height="720" hidden = "true" alt = "hidden"/>
<img id="newImage" width="1280" height="720" hidden = "true" alt = "hidden"/>

<canvas id="glCanvas" width="1280" height="720" />
<div>
	<label for="mirror">Bild spiegeln</label>
	<input type="checkbox" label="Bild spiegeln" id="mirror" />
</div>
<div>
	<label for="mirror">Hintergrund wählen</label>
	<input type="file" label="Bild spiegeln" id="file"/>
</div>

<style>
	#webcam {
		display: none;
	}
</style>
