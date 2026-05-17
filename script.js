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
