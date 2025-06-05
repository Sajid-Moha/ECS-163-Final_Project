/* genres stream graph 
AI Usage notice: used AI to help with code
*/
// Set margins and calculate inner width and height of the SVG container
const margin = { top: 20, right: 150, bottom: 30, left: 50 },
    width = 1000 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// Select the SVG element with id "genres_graph", set its size, and append a group element <g> translated by margins
const svg = d3.select("#genres_graph")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load CSV data asynchronously, with automatic type inference by d3.autoType
d3.csv("./chart_data/top_10_genres_revenue_by_year.csv", d3.autoType).then(data => {
    // Extract unique sorted years from the dataset
    const allYears = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    // Extract unique genres from the dataset
    const allGenres = Array.from(new Set(data.map(d => d.genre_name)));

    // Transform data into a format suitable for stacking:
    // an array where each element corresponds to a year,
    // and has keys for each genre with their total revenue (or 0 if missing)
    const dataByYear = allYears.map(year => {
        const row = { year };
        allGenres.forEach(g => row[g] = 0); // initialize all genres with 0 revenue for the year
        data.filter(d => d.year === year).forEach(d => row[d.genre_name] = d.avg_revenue); // fill with average revenue
        return row;
    });

    // Create a stack generator for all genres using wiggle offset for streamgraph style
    const stack = d3.stack()
        .keys(allGenres)
        .offset(d3.stackOffsetWiggle);

    // Apply stacking to the prepared data by year
    const series = stack(dataByYear);

    // Define X scale as linear from min to max year mapped to pixel width
    const x = d3.scaleLinear()
        .domain(d3.extent(allYears))
        .range([0, width]);

    // Define Y scale as linear based on min and max stacked values across all series
    const y = d3.scaleLinear()
        .domain([
            d3.min(series, s => d3.min(s, d => d[0])), // min baseline
            d3.max(series, s => d3.max(s, d => d[1]))  // max top line
        ])
        .range([height, 0]);

    // Define color scale for genres using D3 categorical scheme
    const color = d3.scaleOrdinal()
        .domain(allGenres)
        .range(d3.schemeCategory10);

    // Define area generator for the streamgraph, using smooth curves
    const area = d3.area()
        .x(d => x(d.data.year))   // X position by year
        .y0(d => y(d[0]))         // Bottom Y of stack
        .y1(d => y(d[1]))         // Top Y of stack
        .curve(d3.curveBasis);    // Smooth curve

    // Create paths for each genre stack in the streamgraph
    const paths = svg.selectAll("path.stream")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "stream")
        .attr("fill", d => color(d.key)) // fill color by genre
        .attr("d", area)                  // path defined by area generator
        .attr("pointer-events", "none"); // disable pointer events on paths (handled on overlay)

    // Append X axis at the bottom with year ticks formatted as integers
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // --- Legend ---
    // Append a legend group translated to the right of the main chart
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 10}, 0)`);

    // For each genre, append a legend row with colored rectangle and text label
    allGenres.forEach((genre, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`); // position row vertically

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", color(genre)); // color box for genre

        row.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(genre)
            .attr("font-size", "12px")
            .attr("alignment-baseline", "middle");
    });

    // Create a tooltip div element for hover info display, initially hidden (opacity 0)
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // Variable to track which genre is "locked" (clicked) — null means no genre locked
    let lockedGenre = null;

    // Append a transparent overlay rectangle over the chart to capture mouse events
    const overlay = svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", mousemove)     // on mouse move, update tooltip and highlight
        .on("mouseout", () => {         // on mouse out, hide tooltip and reset if no genre locked
            if (!lockedGenre) {
                tooltip.style("opacity", 0);
                d3.selectAll("path.stream")
                    .attr("fill", d => color(d.key))
                    .attr("opacity", 1);
            }
        })
        .on("click", clickHandler);    // on click, toggle locking of the genre under cursor

    // Function to handle mousemove over the overlay
    function mousemove(event) {
        const [mx, my] = d3.pointer(event);

        // Convert mouse X position to nearest year integer
        const year = Math.round(x.invert(mx));
        // Get data for that year
        const closestYearData = dataByYear.find(d => d.year === year);
        if (!closestYearData) {
            tooltip.style("opacity", 0);
            return;
        }

        // If a genre is locked (clicked), show only locked genre info
        if (lockedGenre) {
            const revenue = closestYearData[lockedGenre]?.toLocaleString() ?? "0";

            tooltip
                .style("opacity", 1)
                .html(`<strong>Year:</strong> ${year}<br/>
                       <strong>Genre:</strong> ${lockedGenre}<br/>
                       <strong>Average Revenue:</strong> $${revenue}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");

            // Highlight locked genre and fade others
            d3.selectAll("path.stream")
                .attr("opacity", d => d.key === lockedGenre ? 1 : 0.2);

            return;
        }

        // No genre locked - find the genre under mouse Y position for the current year
        const genreAtY = series.find(s => {
            const yearData = s.find(d => d.data.year === year);
            if (!yearData) return false;
            const y0 = y(yearData[0]);
            const y1 = y(yearData[1]);
            return my >= y1 && my <= y0;
        });

        if (genreAtY) {
            const genre = genreAtY.key;
            const revenue = closestYearData[genre].toLocaleString();

            // Show tooltip for hovered genre and year
            tooltip
                .style("opacity", 1)
                .html(`<strong>Year:</strong> ${year}<br/>
                       <strong>Genre:</strong> ${genre}<br/>
                       <strong>Average Revenue:</strong> $${revenue}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");

            // Highlight hovered genre and fade others
            d3.selectAll("path.stream")
                .attr("opacity", d => (d.key === genre ? 1 : 0.2));
        } else {
            // If no genre under mouse, hide tooltip and reset opacity
            tooltip.style("opacity", 0);
            d3.selectAll("path.stream")
                .attr("fill", d => color(d.key))
                .attr("opacity", 1);
        }
    }

    // Function to handle click event on the overlay
    function clickHandler(event) {
        if (lockedGenre) {
            // If a genre is already locked, unlock it on click
            lockedGenre = null;
            tooltip.style("opacity", 0);
            d3.selectAll("path.stream")
                .attr("fill", d => color(d.key))
                .attr("opacity", 1);
        } else {
            // No genre locked yet, detect genre under click position to lock it
            const [mx, my] = d3.pointer(event);
            const year = Math.round(x.invert(mx));
            const genreAtY = series.find(s => {
                const yearData = s.find(d => d.data.year === year);
                if (!yearData) return false;
                const y0 = y(yearData[0]);
                const y1 = y(yearData[1]);
                return my >= y1 && my <= y0;
            });
            if (genreAtY) {
                lockedGenre = genreAtY.key;

                // Highlight locked genre and fade others
                d3.selectAll("path.stream")
                    .attr("opacity", d => (d.key === lockedGenre ? 1 : 0.2));

                // Show tooltip for locked genre at click position
                const closestYearData = dataByYear.find(d => d.year === year);
                const revenue = closestYearData[lockedGenre]?.toLocaleString() ?? "0";

                tooltip
                    .style("opacity", 1)
                    .html(`<strong>Year:</strong> ${year}<br/>
                           <strong>Genre:</strong> ${lockedGenre}<br/>
                           <strong>Average Revenue:</strong> $${revenue}`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        }
    }
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
let year_input = document.getElementById("yearSlider");

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
year_input.addEventListener("input", (ev) => {
    target_year = parseInt(ev.target.value);
    updateChart(target_year);
});

// Load data and initialize chart
d3.csv("./chart_data/top_10_keywords_revenue_by_year.csv", d3.autoType).then(data => {
    fullData = data; // Store all data
    updateChart(target_year); // Initialize chart with default year
});

