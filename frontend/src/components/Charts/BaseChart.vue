<script setup>
import { areDeeplyEqual } from '@/utils'
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ChartTitle from './ChartTitle.vue'

const props = defineProps({
	title: { type: String, required: false },
	subtitle: { type: String, required: false },
	options: { type: Object, required: true },
})

let eChart = null
const chartRef = ref(null)
onMounted(() => {
	// Tạo cấu hình mặc định với font chữ mới
	const defaultFontOptions = {
		textStyle: {
			fontFamily: 'Segoe UI', // Thay đổi font chữ thành Arial
			fontSize: 14,        // Kích thước font chữ
			fontWeight: 'normal', // Độ đậm của font chữ
			color: '#333'         // Màu chữ
		}
	}

	// Gộp tùy chọn hiện tại với cấu hình font chữ mặc định
	const optionsWithFont = {
		...props.options,
		...defaultFontOptions
	}

	// Khởi tạo biểu đồ với tùy chọn bao gồm font chữ
	eChart = echarts.init(chartRef.value, 'light', { renderer: 'svg' })
	Object.keys(props.options).length && eChart.setOption(optionsWithFont)

	const resizeObserver = new ResizeObserver(() => eChart.resize())
	setTimeout(() => chartRef.value && resizeObserver.observe(chartRef.value), 1000)
	onBeforeUnmount(() => chartRef.value && resizeObserver.unobserve(chartRef.value))
})

watch(
	() => props.options,
	(newOptions, oldOptions) => {
		if (!eChart) return
		if (JSON.stringify(newOptions) === JSON.stringify(oldOptions)) return
		if (areDeeplyEqual(newOptions, oldOptions)) return
		eChart.clear()

		// Gộp tùy chọn mới với cấu hình font chữ khi có thay đổi
		const optionsWithFont = {
			...newOptions,
			textStyle: {
				fontFamily: 'Segoe UI',
				fontSize: 14,
				fontWeight: 'normal',
				color: '#333'
			}
		}

		eChart.setOption(optionsWithFont)
	},
	{ deep: true }
)

defineExpose({ downloadChart })
function downloadChart() {
	const image = new Image()
	const type = 'png'
	image.src = eChart.getDataURL({
		type,
		pixelRatio: 2,
		backgroundColor: '#fff',
	})
	const link = document.createElement('a')
	link.href = image.src
	link.download = `${props.title}.${type}`
	link.click()
}
</script>

<template>
	<div class="h-full w-full rounded pb-3">
		<div class="flex h-full w-full flex-col">
			<ChartTitle :title="title" />
			<div ref="chartRef" class="w-full flex-1 overflow-hidden">
				<slot></slot>
			</div>
		</div>
	</div>
</template>
