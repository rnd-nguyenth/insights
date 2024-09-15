import { formatNumber, getShortNumber } from '@/utils';
import { getColors as getDefaultColors } from '@/utils/colors';
import { graphic } from 'echarts/core';

// Hàm chính để tạo tùy chọn biểu đồ với trục X và trục Y
export default function getAxisChartOptions({ chartType, options, data }) {
    const xAxisColumns = getXAxisColumns(options, data); // Lấy các cột trục X từ dữ liệu
    const xAxisValues = getXAxisValues(xAxisColumns, data); // Lấy các giá trị cho trục X
    const datasets = makeDatasets(options, data, xAxisColumns, xAxisValues); // Tạo các tập dữ liệu dựa trên trục X và Y
    return makeOptions(chartType, xAxisValues, datasets, options); // Trả về các tùy chọn biểu đồ hoàn chỉnh
}

// Hàm lấy các cột trục X từ dữ liệu và tùy chọn
function getXAxisColumns(options, data) {
    if (!options.xAxis || !options.xAxis.length) return [];
    const xAxisOptions = handleLegacyAxisOptions(options.xAxis);
    return xAxisOptions
        .filter((xAxisOption) => data[0]?.hasOwnProperty(xAxisOption.column)) // Chỉ lấy các cột có trong dữ liệu
        .map((op) => op.column);
}

// Hàm lấy giá trị trục X từ các cột
function getXAxisValues(xAxisColumns, data) {
    if (!data?.length) return [];
    if (!xAxisColumns.length) return [];

    let firstXAxisColumn = xAxisColumns[0];
    if (typeof firstXAxisColumn !== 'string') {
        // Cảnh báo nếu cột trục X không hợp lệ
        return console.warn('Invalid X-Axis option. Please re-select the X-Axis option.');
    }

    // Lấy tất cả giá trị từ cột trục X đầu tiên và loại bỏ các giá trị trùng lặp
    const values = data.map((d) => d[firstXAxisColumn]);
    return [...new Set(values)];
}

// Hàm tạo các tập dữ liệu dựa trên trục X và Y
function makeDatasets(options, data, xAxisColumns, xAxisValues) {
    let yAxis = options.yAxis;
    if (!data?.length || !yAxis?.length) return [];
    yAxis = handleLegacyAxisOptions(yAxis);

    // Lọc ra các cột Y hợp lệ
    const validYAxisOptions = yAxis.filter(
        (yAxisOption) =>
            data[0].hasOwnProperty(yAxisOption?.column) || data[0].hasOwnProperty(yAxisOption)
    );

    // Nếu chỉ có một cột trục X, xử lý đơn giản hơn
    if (xAxisColumns.length === 1) {
        const xAxisColumn = xAxisColumns[0];
        return validYAxisOptions.map((option) => {
            const column = option.column || option;
            const seriesOptions = option.series_options || {};
            const _data = xAxisValues.map((xAxisValue) => {
                const points = data.filter((d) => d[xAxisColumn] === xAxisValue); // Lọc giá trị theo trục X
                const sum = points.reduce((acc, curr) => acc + curr[column], 0); // Tổng hợp giá trị của trục Y
                return sum;
            });
            return {
                label: column,
                data: _data,
                series_options: seriesOptions,
            };
        });
    }

    // Nếu có nhiều cột trục X, xử lý như nhiều chuỗi dữ liệu (series) khác nhau
    const datasets = [];
    const firstAxisColumn = xAxisColumns[0];
    const restAxisColumns = xAxisColumns.slice(1);

    for (let yAxisOption of validYAxisOptions) {
        const datamap = {};
        const column = yAxisOption.column || yAxisOption;
        const seriesOptions = yAxisOption.series_options || {};

        for (let xAxisOption of restAxisColumns) {
            let subXAxisValues = [...new Set(data.map((d) => d[xAxisOption]))];
            for (let subXAxisValue of subXAxisValues) {
                let subXAxisData = data.filter((d) => d[xAxisOption] === subXAxisValue);
                for (let xAxisValue of xAxisValues) {
                    let dataSetStack = subXAxisData.find(
                        (row) => row[firstAxisColumn] === xAxisValue
                    );
                    let value = dataSetStack?.[column] || 0;
                    if (subXAxisValue in datamap) {
                        datamap[subXAxisValue].push(value);
                    } else {
                        datamap[subXAxisValue] = [value];
                    }
                }
            }
        }
        for (const [label, data] of Object.entries(datamap)) {
            datasets.push({
                label,
                data,
                series_options: seriesOptions,
            });
        }
    }

    return datasets;
}

// Hàm tạo các tùy chọn biểu đồ dựa trên loại biểu đồ, trục X và Y
function makeOptions(chartType, labels, datasets, options) {
    if (!datasets?.length) return {};

    const colors = options.colors?.length
        ? [...options.colors, ...getDefaultColors()]
        : getDefaultColors();

    const isBarChart = chartType === 'bar';

    return {
        animation: false,
        color: colors,
        grid: {
            top: 15,
            bottom: 35,
            left: 100,
            right: 35,
            containLabel: true, // Đảm bảo nhãn không bị cắt
        },
        xAxis: {
            axisType: 'xAxis',
            type: 'category',
            axisTick: false,
            data: labels,
            splitLine: {
                show: chartType === 'scatter',
                lineStyle: { type: 'dashed' },
            },
            axisLabel: {
                rotate: 0,
                fontSize: 14,
                fontWeight: '500',
                lineHeight: 24,
                interval: 0,  // Hiển thị tất cả nhãn
                formatter: (value) => {
                    // Nếu chuỗi quá dài, chỉ hiển thị 4 từ đầu tiên và thêm dấu "..."
                    const words = value.split(' ');
                    if (words.length > 4) {
                        return words.slice(0, 4).join(' ') + '...';
                    } else {
                        return value;
                    }
                },
            },
        },
        yAxis: datasets.map((dataset) => ({
            name: options.splitYAxis ? dataset.label : undefined,
            nameGap: 45,
            nameLocation: 'middle',
            nameTextStyle: { color: 'transparent' },
            type: 'value',
            splitLine: {
                lineStyle: { type: 'dashed' },
            },
            axisLabel: {
                formatter: (value) => (!isNaN(value) ? getShortNumber(value, 1) : value),
            },
        })),
        series: datasets.map((dataset, index) => ({
            name: dataset.label,
            data: dataset.data,
            type: chartType || dataset.series_options.type || 'bar',
            yAxisIndex: options.splitYAxis ? index : 0,
            color: dataset.series_options.color || colors[index],
            markLine: getMarkLineOption(options),
            smoothMonotone: 'x',
            smooth: dataset.series_options.smoothLines || options.smoothLines ? 0.4 : false,
            showSymbol: dataset.series_options.showPoints || options.showPoints,
            symbolSize: chartType === 'scatter' ? 10 : 5,
            areaStyle:
                dataset.series_options.showArea || options.showArea
                    ? {
                            color: new graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: dataset.series_options.color || colors[index] },
                                { offset: 1, color: '#fff' },
                            ]),
                            opacity: 0.2,
                      }
                    : undefined,
            itemStyle: {
                borderRadius: options.roundedBars !== undefined && index === datasets.length - 1 ? [4, 4, 0, 0] : 0,
                barMaxWidth: 50,
            },
            stack: options.stack ? 'stack' : null,
            label: {
                position: 'top',
                formatter: '{c}', // Hiển thị giá trị trên mỗi cột
            },
        })),
        legend: {
            icon: 'circle',
            type: 'scroll',
            bottom: 'bottom',
            pageIconSize: 12,
            pageIconColor: '#64748B',
            pageIconInactiveColor: '#C0CCDA',
            pageFormatter: '{current}',
            pageButtonItemGap: 2,
            textStyle: {
                fontSize: 12,
                fontFamily: 'Segoe UI',
                fontWeight: 'normal',
                overflow: 'truncate', // Cắt bớt văn bản nếu quá dài
                width: 100,
            },
        },
        tooltip: {
            trigger: 'axis',
            confine: true,
            appendToBody: false,
            formatter: (params) => {
                // Đảo thứ tự hiển thị trong tooltip
                let tooltipText = `${params[0].axisValueLabel}<br/>`;
                const reversedParams = params.reverse();
                reversedParams.forEach(param => {
                    tooltipText += `${param.marker} ${param.seriesName}: ${param.value.toFixed(2)}<br/>`;
                });
                return tooltipText;
            },
            valueFormatter: (value) => (isNaN(value) ? value : value.toFixed(2)),
        },
    };
}

// Hàm để tạo dòng tham chiếu (mark line) trong biểu đồ nếu có
function getMarkLineOption(options) {
    return options.referenceLine
        ? {
                data: [
                    {
                        name: options.referenceLine,
                        type: options.referenceLine.toLowerCase(),
                        label: { position: 'middle', formatter: '{b}: {c}' },
                    },
                ],
          }
        : {};
}

// Hàm để xử lý tùy chọn trục (axis options) cho các phiên bản cũ
function handleLegacyAxisOptions(axisOptions) {
    if (typeof axisOptions === 'string') {
        axisOptions = [{ column: axisOptions }];
    }
    if (Array.isArray(axisOptions) && typeof axisOptions[0] === 'string') {
        axisOptions = axisOptions.map((column) => ({ column }));
    }
    return axisOptions;
}
