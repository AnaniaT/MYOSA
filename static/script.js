// Chart Section
const chartTheme = {
	grid: "rgba(148, 181, 220, 0.14)",
	text: "#b7cce9",
	humidity: "#22e6a7",
	pressure: "#4d9dff"
};

const chartDataSource = {
	humidity: {
		daily: {
			labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
			data: [42, 45, 40, 48, 51, 46]
		},
		weekly: {
			labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			data: [44, 46, 43, 49, 52, 47, 45]
		}
	},
	pressure: {
		daily: {
			labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
			data: [1012, 1013, 1011, 1014, 1016, 1013]
		},
		weekly: {
			labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			data: [1011, 1012, 1010, 1013, 1015, 1014, 1012]
		}
	}
};

function buildChart(ctx, accent) {
	return new Chart(ctx, {
		type: "line",
		data: {
			labels: [],
			datasets: [
				{
					data: [],
					borderColor: accent,
					backgroundColor: `${accent}1A`,
					fill: true,
					tension: 0.35,
					pointRadius: 3,
					pointBackgroundColor: accent
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: "rgba(10, 18, 33, 0.95)",
					borderColor: "rgba(255,255,255,0.12)",
					borderWidth: 1,
					titleColor: "#e7f1ff",
					bodyColor: "#c3d7f4"
				}
			},
			scales: {
				x: { grid: { color: chartTheme.grid }, ticks: { color: chartTheme.text } },
				y: { grid: { color: chartTheme.grid }, ticks: { color: chartTheme.text } }
			}
		}
	});
}

const chartState = {
	humidity: { range: "daily", offset: 0 },
	pressure: { range: "daily", offset: 0 }
};

const chartLimits = {
	daily: 6,
	weekly: 3
};

function getOffsetLabel(range, offset) {
	if (offset === 0) return range === "daily" ? "Today" : "This week";
	if (range === "daily") return offset === 1 ? "Yesterday" : `${offset} days ago`;
	return offset === 1 ? "1 week ago" : `${offset} weeks ago`;
}

function getSeries(metric, range, offset) {
	const snapshot = chartDataSource[metric][range];
	const trend = range === "daily" ? -0.6 : -0.8;
	const wobble = range === "daily" ? 0.4 : 0.3;
	const data = snapshot.data.map((value, index) =>
		Number((value + offset * trend + (index % 2 === 0 ? -wobble : wobble)).toFixed(1))
	);
	return { labels: snapshot.labels, data };
}

function updateChart(chart, metric) {
	const { range, offset } = chartState[metric];
	const snapshot = getSeries(metric, range, offset);
	chart.data.labels = snapshot.labels;
	chart.data.datasets[0].data = snapshot.data;
	chart.update();
	updateChartNav(metric);
}

function updateChartNav(metric) {
	const nav = document.querySelector(`.chart-nav[data-target="${metric}"]`);
	if (!nav) return;
	const { range, offset } = chartState[metric];
	const label = nav.querySelector("[data-label]");
	if (label) {
		label.textContent = getOffsetLabel(range, offset);
	}
	const prev = nav.querySelector("[data-dir='prev']");
	const next = nav.querySelector("[data-dir='next']");
	const maxOffset = chartLimits[range];
	if (prev) prev.disabled = offset >= maxOffset;
	if (next) next.disabled = offset <= 0;
}

function handleChartToggle(event) {
	const button = event.target.closest(".chart-btn");
	if (!button) return;
	const controls = event.currentTarget;
	const range = button.dataset.range;
	const metric = controls.dataset.target;
	controls.querySelectorAll(".chart-btn").forEach((btn) => btn.classList.toggle("active", btn === button));
	chartState[metric].range = range;
	chartState[metric].offset = 0;
	const chart = metric === "humidity" ? window.humidityChart : window.pressureChart;
	if (chart) updateChart(chart, metric);
}

function handleChartNav(event) {
	const button = event.target.closest(".nav-btn");
	if (!button) return;
	const nav = event.currentTarget;
	const metric = nav.dataset.target;
	const dir = button.dataset.dir;
	const { range } = chartState[metric];
	const maxOffset = chartLimits[range];
	if (dir === "prev") {
		chartState[metric].offset = Math.min(chartState[metric].offset + 1, maxOffset);
	} else {
		chartState[metric].offset = Math.max(chartState[metric].offset - 1, 0);
	}
	const chart = metric === "humidity" ? window.humidityChart : window.pressureChart;
	if (chart) updateChart(chart, metric);
}

function initCharts() {
	const humidityCanvas = document.getElementById("humidity-chart");
	const pressureCanvas = document.getElementById("pressure-chart");
	if (!humidityCanvas || !pressureCanvas) return;

	window.humidityChart = buildChart(humidityCanvas, chartTheme.humidity);
	window.pressureChart = buildChart(pressureCanvas, chartTheme.pressure);

	document.querySelectorAll(".chart-controls").forEach((controls) => {
		controls.addEventListener("click", handleChartToggle);
	});

	document.querySelectorAll(".chart-nav").forEach((nav) => {
		nav.addEventListener("click", handleChartNav);
	});

	updateChart(window.humidityChart, "humidity");
	updateChart(window.pressureChart, "pressure");
}

document.addEventListener("DOMContentLoaded", () => {
	initCharts();
});

// Heatmap section
// On Hover Room Temp
const tooltip = document.getElementById("thermal-tooltip");
const tooltipRoom = document.getElementById("tooltip-room");
const tooltipValue = document.getElementById("tooltip-value");
const tooltipLight = document.getElementById("tooltip-light");

function getRoomTemperature(room) {
    const value = room.getAttribute("data-heat");
    return value ? `${value} °C` : "-- °C";
}

function getRoomLight(room) {
	const value = room.getAttribute("data-light");
	return value ? `${value} lx` : "-- lx";
}

function positionTooltip(event) {
    const offset = 16;
    const tooltipRect = tooltip.getBoundingClientRect();
    let x = event.clientX + offset;
    let y = event.clientY + offset;

    if (x + tooltipRect.width > window.innerWidth - 12) {
    x = event.clientX - tooltipRect.width - offset;
    }
    if (y + tooltipRect.height > window.innerHeight - 12) {
    y = event.clientY - tooltipRect.height - offset;
    }

    tooltip.style.left = `${Math.max(12, x)}px`;
    tooltip.style.top = `${Math.max(12, y)}px`;
}

function handleRoomEnter(event) {
    const room = event.currentTarget;
    tooltipRoom.textContent = room.getAttribute("data-room") || "Room";
    tooltipValue.textContent = getRoomTemperature(room);
	tooltipLight.textContent = getRoomLight(room);
    tooltip.classList.add("visible");
    positionTooltip(event);
}

function handleRoomMove(event) {
	tooltipValue.textContent = getRoomTemperature(event.currentTarget);
	tooltipLight.textContent = getRoomLight(event.currentTarget);
    positionTooltip(event);
}

function handleRoomLeave() {
    tooltip.classList.remove("visible");
}

const heatmapConfig = {
	min: 18,
	max: 30,
	colors: {
	cool: "#22e6a7",
	stable: "#4d9dff",
	warm: "#ff8b3d",
	hot: "#ff4d6d"
	}
};

function lerpColor(a, b, t) {
	const ah = parseInt(a.slice(1), 16);
	const ar = (ah >> 16) & 0xff;
	const ag = (ah >> 8) & 0xff;
	const ab = ah & 0xff;
	const bh = parseInt(b.slice(1), 16);
	const br = (bh >> 16) & 0xff;
	const bg = (bh >> 8) & 0xff;
	const bb = bh & 0xff;
	const rr = Math.round(ar + (br - ar) * t);
	const rg = Math.round(ag + (bg - ag) * t);
	const rb = Math.round(ab + (bb - ab) * t);
	return `rgb(${rr}, ${rg}, ${rb})`;
}

function heatToColor(value) {
	const { min, max, colors } = heatmapConfig;
	const clamped = Math.min(Math.max(value, min), max);
	const normalized = (clamped - min) / (max - min);
	if (normalized <= 0.33) {
	return lerpColor(colors.cool, colors.stable, normalized / 0.33);
	}
	if (normalized <= 0.66) {
	return lerpColor(colors.stable, colors.warm, (normalized - 0.33) / 0.33);
	}
	return lerpColor(colors.warm, colors.hot, (normalized - 0.66) / 0.34);
}

function buildHeatStops(colorRamp) {
	return `${colorRamp[0]} 0%, ${colorRamp[1]} 35%, ${colorRamp[2]} 60%, ${colorRamp[3]} 85%, rgba(0,0,0,0) 100%`;
}

function getRoomKey(room) {
	return room.getAttribute("data-room").toLowerCase();
}

function getDefaultOrigin(room) {
	return room.getAttribute("data-origin") || "50% 50%";
}

function getDefaultAngle(room) {
	return room.getAttribute("data-angle") || "0";
}

function setHeatmapData(roomData) {
	const rooms = document.querySelectorAll(".thermal-room");
	rooms.forEach((room) => {
	const key = getRoomKey(room);
	const entry = roomData[key];
	const tempValue = typeof entry === "number"
		? entry
		: Number(entry?.value ?? room.getAttribute("data-heat"));
	const lightValue = entry?.light ?? room.getAttribute("data-light");
	const origin = entry?.origin ?? getDefaultOrigin(room);
	const angle = entry?.angle ?? getDefaultAngle(room);
	const colorRamp = entry?.colors ?? [
		heatmapConfig.colors.cool,
		heatmapConfig.colors.stable,
		heatmapConfig.colors.warm,
		heatmapConfig.colors.hot
	];
	const color = heatToColor(tempValue);
	room.setAttribute("data-heat", tempValue);
	if (lightValue !== null && lightValue !== undefined) {
		room.setAttribute("data-light", lightValue);
	}
	room.style.setProperty("--heat-origin", origin);
	room.style.setProperty("--heat-angle", `${angle}deg`); // Not used atp
	room.style.setProperty("--heat-stops", buildHeatStops(colorRamp));
	room.style.setProperty("--heat-glow", color);
	});

	const tooltip = document.getElementById("thermal-tooltip");
	const tooltipRoom = document.getElementById("tooltip-room");
	console.log(12);
	if (tooltip && tooltip.classList.contains("visible") && tooltipRoom) {
	console.log(32);
	const activeName = tooltipRoom.textContent?.trim().toLowerCase();
	const activeRoom = Array.from(rooms).find(
		(room) => room.getAttribute("data-room")?.toLowerCase() === activeName
	);
	if (activeRoom) {
		console.log(45);
		tooltipValue.textContent = getRoomTemperature(activeRoom);
		tooltipLight.textContent = getRoomLight(activeRoom);
	}
	}
	
}

async function refreshHeatmap() {
	try {
	const response = await fetch("/heatmap");
	if (!response.ok) return;
	const data = await response.json();
	if (data && data.rooms) {
		setHeatmapData(data.rooms);
	}
	} catch (error) {
	return;
	}
}

window.setHeatmapData = setHeatmapData;
setHeatmapData({});
setInterval(refreshHeatmap, 3000);

document.querySelectorAll(".thermal-room").forEach((room) => {
    room.addEventListener("mouseenter", handleRoomEnter);
    room.addEventListener("mousemove", handleRoomMove);
    room.addEventListener("mouseleave", handleRoomLeave);
});

