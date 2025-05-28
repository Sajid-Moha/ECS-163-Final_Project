/* genres stream graph */
const margin = { top: 20, right: 150, bottom: 30, left: 50 },
      width = 1000 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#genres_graph")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("./chart_data/top_10_genres_revenue_by_year.csv", d3.autoType).then(data => {
    const allYears = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const allGenres = Array.from(new Set(data.map(d => d.genre_name)));

    const dataByYear = allYears.map(year => {
        const row = { year };
        allGenres.forEach(g => row[g] = 0);
        data.filter(d => d.year === year).forEach(d => row[d.genre_name] = d.total_revenue);
        return row;
    });

    const stack = d3.stack()
        .keys(allGenres)
        .offset(d3.stackOffsetWiggle);

    const series = stack(dataByYear);

    const x = d3.scaleLinear()
        .domain(d3.extent(allYears))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(series, s => d3.min(s, d => d[0])),
            d3.max(series, s => d3.max(s, d => d[1]))
        ])
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(allGenres)
        .range(d3.schemeCategory10);

    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    svg.selectAll("path")
        .data(series)
        .enter()
        .append("path")
        .attr("fill", d => color(d.key))
        .attr("d", area)
        .append("title")
        .text(d => d.key);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // --- Legend ---
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 10}, 0)`);

    allGenres.forEach((genre, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", color(genre));

        row.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(genre)
            .attr("font-size", "12px")
            .attr("alignment-baseline", "middle");
    });
});

/* keywords graph 
AI Usage notice: used AI to generate scatterplot animation code
*/
const k_margin = { top: 20, right: 150, bottom: 100, left: 150 },
    k_width = 1000 - k_margin.left - k_margin.right,
    k_height = 500 - k_margin.top - k_margin.bottom;

const k_svg = d3.select("#keywords_graph")
    .attr("width", k_width + k_margin.left + k_margin.right)
    .attr("height", k_height + k_margin.top + k_margin.bottom)
    .append("g")
    .attr("transform", `translate(${k_margin.left},${k_margin.top})`);

let target_year = 2000;
let fullData = [];
let year_input = document.getElementById("year_input");

// Animation duration
const TRANSITION_DURATION = 750;

// create axises
const xScale = d3.scaleBand()
    .range([0, k_width])
    .padding(0.2);
const yScale = d3.scaleLinear()
    .range([k_height, 0]);
const xAxisGroup = k_svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${k_height})`);
const yAxisGroup = k_svg.append("g")
    .attr("class", "y-axis");

// refresh function for chart
function updateChart(newYear) {
    // filter data: must be within target year
    // sort data
    const filteredData = fullData
        .filter(item => item.year === parseInt(newYear))
        .sort((a, b) => d3.descending(a.total_revenue, b.total_revenue));

    // set scales
    xScale.domain(filteredData.map(d => d.keyword));
    yScale.domain([0, d3.max(filteredData, d => d.total_revenue) || 0]);

    // create color scale for genres
    const genres = [...new Set(filteredData.map(d => d.genre))];
    const colorScale = d3.scaleOrdinal()
        .domain(genres)
        .range(d3.schemeCategory10);

    // Update x-axis with animation
    xAxisGroup
        .transition()
        .duration(TRANSITION_DURATION)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Update y-axis with animation
    yAxisGroup
        .transition()
        .duration(TRANSITION_DURATION)
        .call(d3.axisLeft(yScale));

    // bind data to bars
    const bars = k_svg.selectAll(".bar")
        .data(filteredData, d => d.keyword);

    // remove unneeded bars
    bars.exit()
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("height", 0)
        .attr("y", k_height)
        .style("opacity", 0)
        .remove();

    // add new bars
    const barsEnter = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.keyword))
        .attr("y", k_height)
        .attr("width", xScale.bandwidth())
        .attr("height", 0)
        .attr("fill", d => colorScale(d.genre))
        .style("opacity", 0);

    // update selections
    const barsUpdate = barsEnter.merge(bars);

    // animate: move all bars to their new positions
    barsUpdate
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("x", d => xScale(d.keyword))
        .attr("y", d => yScale(d.total_revenue))
        .attr("width", xScale.bandwidth())
        .attr("height", d => k_height - yScale(d.total_revenue))
        .attr("fill", d => colorScale(d.genre))
        .style("opacity", 1);
}

// Event listener for year input changes
year_input.addEventListener("change", (ev) => {
    target_year = parseInt(ev.target.value);
    updateChart(target_year);
});

// Load data and initialize chart
d3.csv("./chart_data/top_10_keywords_revenue_by_year.csv", d3.autoType).then(data => {
    fullData = data; // Store all data
    updateChart(target_year); // Initialize chart with default year
});

