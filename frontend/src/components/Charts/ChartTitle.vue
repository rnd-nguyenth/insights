<script setup>
const props = defineProps({
	title: { type: String, required: false },
})
</script>

<template>
	<div class="px-4 py-2 text-lg font-medium leading-6 text-black">
		{{ title }}
	</div>
</template>
