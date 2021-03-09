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

<canvas id="glCanvas" width="1280" height="720" />
<div>
	<label for="mirror">Bild spiegeln</label>
	<input type="checkbox" label="Bild spiegeln" id="mirror" />
</div>

<style>
	#webcam {
		display: none;
	}
</style>
